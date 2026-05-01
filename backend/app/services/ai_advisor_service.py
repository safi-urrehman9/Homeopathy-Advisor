from __future__ import annotations

import json
import logging
import time
from typing import Any

from flask import current_app

from app.services.deepseek_service import DeepSeekClient, get_deepseek_client
from app.services.media_processing_service import MediaProcessingService, get_media_processing_service
from app.services.oorep_service import OorepService, get_oorep_service


logger = logging.getLogger(__name__)


class AiAdvisorService:
    def __init__(
        self,
        deepseek: DeepSeekClient | None = None,
        oorep: OorepService | None = None,
        media: MediaProcessingService | None = None,
    ):
        self.deepseek = deepseek or get_deepseek_client()
        self.oorep = oorep or get_oorep_service()
        self.media = media or get_media_processing_service()

    def extract_symptoms(self, text: str) -> str:
        return self.deepseek.complete_text(
            model=current_app.config["DEEPSEEK_FAST_MODEL"],
            system=(
                "You are an expert homeopathic case-taking assistant. You convert raw patient narratives "
                "into structured homeopathic symptom lists using standard repertory conventions.\n\n"
                "TERMINOLOGY:\n"
                "- Rubric: A standardized repertory symptom entry, e.g. 'Mind > Anxiety > Night'.\n"
                "- Modality: A condition that makes a symptom worse (<) or better (>), such as worse motion "
                "or better warmth.\n"
                "- Mentals: Emotional and psychological symptoms.\n"
                "- Generals: Whole-person symptoms, including energy, temperature, thirst, sleep, appetite, "
                "sweat, and food desires or aversions.\n"
                "- Particulars: Localized symptoms in a specific body part.\n"
                "- Concomitant: A symptom occurring at the same time as the chief complaint.\n"
                "- Causation: The event or circumstance that triggered the complaint.\n\n"
                "Use repertory-style phrasing where possible. Do not invent facts that are absent from the case."
            ),
            prompt=(
                "Extract key homeopathic symptoms from this case text. Use plain text dashes only.\n\n"
                "OUTPUT FORMAT:\n"
                "## Chief Complaints\n"
                "- [symptom] | Location: [where] | Sensation: [what it feels like] | Modalities: "
                "worse [X], better [Y] | Concomitants: [if any]\n\n"
                "## Mentals\n"
                "- ...\n\n"
                "## Generals\n"
                "- ...\n\n"
                "## Particulars\n"
                "- ...\n\n"
                "## Causation\n"
                "- ...\n\n"
                "## Rubric Suggestions\n"
                "- [Repertory-style rubric for OOREP lookup]\n\n"
                "EXAMPLES:\n"
                "Raw patient text: Headache gets worse from the slightest movement and better by lying still.\n"
                "Structured output:\n"
                "## Chief Complaints\n"
                "- Headache | Location: head | Sensation: pain | Modalities: worse motion, better lying still | "
                "Concomitants: not stated\n"
                "## Rubric Suggestions\n"
                "- Head > Pain > Motion agg.\n"
                "- Head > Pain > Lying > Amel.\n\n"
                "Raw patient text: Child is anxious at night, wants company, thirsty for small sips.\n"
                "Structured output:\n"
                "## Mentals\n"
                "- Anxiety at night | Modalities: worse night | Concomitants: desire for company\n"
                "## Generals\n"
                "- Thirst for small sips\n"
                "## Rubric Suggestions\n"
                "- Mind > Anxiety > Night\n"
                "- Mind > Company > Desire for\n"
                "- Stomach > Thirst > Small quantities, for\n\n"
                f"Raw patient text:\n{text}"
            ),
        )

    def suggest_remedies(
        self,
        symptoms: str,
        patient_summary: str = "",
        recent_consultations: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        started_at = time.monotonic()
        recent_consultations = recent_consultations or []
        repertory, query_count = self._decompose_and_search(symptoms)
        remedy_candidates = self._top_remedy_names(repertory)
        if not remedy_candidates:
            logger.info(
                "ai.suggest_remedies.insufficient_evidence",
                extra={"query_count": query_count, "rubric_count": len(repertory.get("rubrics") or [])},
            )
            return {
                "issues": "Insufficient repertory evidence for these symptoms.",
                "differentiationLogic": "",
                "remedies": [],
                "evidenceQuality": "insufficient",
                "_meta": {
                    "retrieval": {
                        "queryCount": query_count,
                        "rubricCount": len(repertory.get("rubrics") or []),
                        "candidateCount": 0,
                    }
                },
            }

        materia_results = [
            self.oorep.search_materia_medica(symptoms, remedy=remedy, max_results=3)
            for remedy in remedy_candidates[:5]
        ]
        evidence = self._compact_evidence(repertory, materia_results)
        evidence_scores = {remedy: self._compute_evidence_score(repertory, remedy) for remedy in remedy_candidates}
        evidence["remedyScores"] = evidence_scores
        evidence_quality = self._overall_evidence_quality(evidence_scores)
        prompt = self._remedy_prompt(symptoms, patient_summary, recent_consultations, evidence)
        parsed = self.deepseek.complete_json(
            model=current_app.config["DEEPSEEK_REASONING_MODEL"],
            system=(
                "You are a homeopathic clinical decision-support assistant. Use only the provided "
                "OOREP evidence and patient context. Do not invent citations."
            ),
            prompt=prompt,
        )
        remedies = self._attach_evidence_scores(parsed.get("remedies", []), evidence_scores)
        elapsed_ms = int((time.monotonic() - started_at) * 1000)
        logger.info(
            "ai.suggest_remedies.completed",
            extra={
                "query_count": query_count,
                "rubric_count": len(repertory.get("rubrics") or []),
                "candidate_count": len(remedy_candidates),
                "evidence_quality": evidence_quality,
                "elapsed_ms": elapsed_ms,
            },
        )
        return {
            "issues": parsed.get("issues", ""),
            "differentiationLogic": parsed.get("differentiationLogic", ""),
            "remedies": remedies,
            "evidenceQuality": evidence_quality,
            "_meta": {
                "retrieval": {
                    "queryCount": query_count,
                    "rubricCount": len(repertory.get("rubrics") or []),
                    "candidateCount": len(remedy_candidates),
                    "elapsedMs": elapsed_ms,
                }
            },
        }

    def process_audio(self, base64_audio: str, mime_type: str = "") -> str:
        return self.media.process_audio(base64_audio, mime_type)

    def process_image(self, base64_image: str, mime_type: str = "") -> str:
        return self.media.process_image(base64_image, mime_type)

    def search_materia_medica(self, query: str) -> str:
        results = self.oorep.search_materia_medica(query, max_results=10)
        prompt = (
            "Summarize these OOREP materia medica search results for a doctor. Keep it concise and "
            "mention the remedy/source for each useful point.\n\n"
            f"Query: {query}\n\nOOREP results:\n{json.dumps(results, default=str)}"
        )
        return self.deepseek.complete_text(
            model=current_app.config["DEEPSEEK_FAST_MODEL"],
            system="You summarize homeopathic reference search results for qualified practitioners.",
            prompt=prompt,
        )

    def summarize_patient_history(
        self,
        current_summary: str,
        latest_consultation: dict[str, Any],
    ) -> str:
        prompt = (
            "Update this compact patient homeopathy case summary using the latest consultation. "
            "Keep under 180 words. Preserve long-term constitutional patterns, remedy responses, "
            "recurring modalities, and unresolved issues. Return plain text only.\n\n"
            f"Current summary:\n{current_summary or 'No prior AI summary.'}\n\n"
            f"Latest consultation:\n{json.dumps(latest_consultation, default=str)}"
        )
        return self.deepseek.complete_text(
            model=current_app.config["DEEPSEEK_FAST_MODEL"],
            system="You maintain concise longitudinal case summaries for doctors.",
            prompt=prompt,
        )

    def _top_remedy_names(self, repertory: dict[str, Any]) -> list[str]:
        stats = repertory.get("remedyStats") or []
        if stats:
            return [
                item.get("name") or item.get("abbreviation")
                for item in sorted(
                    stats,
                    key=lambda item: (item.get("cumulativeWeight") or 0, item.get("count") or 0),
                    reverse=True,
                )
                if item.get("name") or item.get("abbreviation")
            ]
        names: list[str] = []
        for rubric in repertory.get("rubrics") or []:
            for remedy in rubric.get("remedies") or []:
                name = remedy.get("name") or remedy.get("abbreviation")
                if name and name not in names:
                    names.append(name)
        return names

    def _decompose_and_search(self, symptoms: str) -> tuple[dict[str, Any], int]:
        queries = self._decompose_symptoms(symptoms)
        if not queries:
            queries = [symptoms]
        if len(queries) == 1 and queries[0] == symptoms:
            result = self.oorep.search_repertory(symptoms, max_results=8)
            return result, 1
        results = [self.oorep.search_repertory(query, max_results=4) for query in queries[:6]]
        return self._merge_repertory_results(results), len(results)

    def _decompose_symptoms(self, symptoms: str) -> list[str]:
        prompt = (
            "Split this homeopathic case into individual searchable repertory phrases for OOREP lookup. "
            "Prefer characteristic symptoms with location, sensation, modality, concomitant, and mental/general "
            "phrasing when present. Return JSON only as {\"symptoms\": [\"phrase\"]}. Limit to 6 phrases.\n\n"
            f"Case:\n{symptoms}"
        )
        try:
            parsed = self.deepseek.complete_json(
                model=current_app.config["DEEPSEEK_FAST_MODEL"],
                system="You prepare concise repertory search queries for homeopathic evidence retrieval.",
                prompt=prompt,
            )
        except Exception:
            logger.exception("ai.decompose_symptoms.failed")
            return [symptoms]
        raw_queries = parsed.get("symptoms") if isinstance(parsed, dict) else None
        if not isinstance(raw_queries, list):
            return [symptoms]
        queries: list[str] = []
        for item in raw_queries:
            query = str(item or "").strip()
            if query and query not in queries:
                queries.append(query)
            if len(queries) == 6:
                break
        return queries

    def _merge_repertory_results(self, results: list[dict[str, Any]]) -> dict[str, Any]:
        rubrics_by_key: dict[tuple[str, str], dict[str, Any]] = {}
        for result in results:
            for rubric in result.get("rubrics") or []:
                rubric_name = str(rubric.get("rubric") or "").strip()
                repertory_name = str(rubric.get("repertory") or "").strip()
                if not rubric_name:
                    continue
                key = (repertory_name, rubric_name)
                existing = rubrics_by_key.setdefault(
                    key,
                    {"rubric": rubric.get("rubric"), "repertory": rubric.get("repertory"), "remedies": []},
                )
                remedies_by_name = {
                    remedy.get("name") or remedy.get("abbreviation"): remedy
                    for remedy in existing.get("remedies") or []
                    if remedy.get("name") or remedy.get("abbreviation")
                }
                for remedy in rubric.get("remedies") or []:
                    name = remedy.get("name") or remedy.get("abbreviation")
                    if not name:
                        continue
                    previous = remedies_by_name.get(name)
                    if previous is None or (remedy.get("weight") or 0) > (previous.get("weight") or 0):
                        remedies_by_name[name] = remedy
                existing["remedies"] = list(remedies_by_name.values())
        rubrics = list(rubrics_by_key.values())
        stats_by_name: dict[str, dict[str, Any]] = {}
        for rubric in rubrics:
            for remedy in rubric.get("remedies") or []:
                name = remedy.get("name") or remedy.get("abbreviation")
                if not name:
                    continue
                stat = stats_by_name.setdefault(
                    name,
                    {"name": remedy.get("name"), "abbreviation": remedy.get("abbreviation"), "count": 0, "cumulativeWeight": 0},
                )
                stat["count"] += 1
                stat["cumulativeWeight"] += remedy.get("weight") or 0
        remedy_stats = sorted(
            stats_by_name.values(),
            key=lambda item: (item.get("cumulativeWeight") or 0, item.get("count") or 0),
            reverse=True,
        )
        return {"rubrics": rubrics, "remedyStats": remedy_stats}

    def _compact_evidence(self, repertory: dict[str, Any], materia_results: list[dict[str, Any]]) -> dict[str, Any]:
        rubrics = []
        for rubric in (repertory.get("rubrics") or [])[:8]:
            rubrics.append(
                {
                    "rubric": rubric.get("rubric"),
                    "repertory": rubric.get("repertory"),
                    "remedies": (rubric.get("remedies") or [])[:8],
                }
            )
        materia = []
        for result_set in materia_results:
            for result in (result_set.get("results") or [])[:3]:
                sections = []
                for section in (result.get("sections") or [])[:3]:
                    sections.append(
                        {
                            "heading": section.get("heading"),
                            "content": self._truncate_at_sentence(str(section.get("content") or ""), 700),
                        }
                    )
                materia.append(
                    {
                        "remedy": result.get("remedy"),
                        "materiaMedica": result.get("materiaMedica"),
                        "sections": sections,
                    }
                )
        return {"rubrics": rubrics, "materiaMedica": materia[:12]}

    def _truncate_at_sentence(self, text: str, max_chars: int = 700) -> str:
        text = " ".join(text.split())
        if len(text) <= max_chars:
            return text
        truncated = text[:max_chars]
        sentence_ends = [truncated.rfind("."), truncated.rfind("!"), truncated.rfind("?")]
        last_sentence = max(sentence_ends)
        if last_sentence > max_chars * 0.5:
            return truncated[: last_sentence + 1]
        return truncated[: max_chars - 3].rstrip() + "..."

    def _compute_evidence_score(self, repertory: dict[str, Any], remedy_name: str) -> dict[str, Any]:
        rubric_count = 0
        cumulative_weight = 0
        for rubric in repertory.get("rubrics") or []:
            for remedy in rubric.get("remedies") or []:
                name = remedy.get("name") or remedy.get("abbreviation")
                if name == remedy_name:
                    rubric_count += 1
                    cumulative_weight += remedy.get("weight") or 0
        max_possible = len(repertory.get("rubrics") or []) * 4
        percentage = round((cumulative_weight / max_possible) * 100) if max_possible else 0
        percentage = max(0, min(100, percentage))
        quality = self._quality_for_percentage(percentage)
        return {
            "rubricCount": rubric_count,
            "cumulativeWeight": cumulative_weight,
            "maxPossibleWeight": max_possible,
            "percentage": percentage,
            "quality": quality,
        }

    def _quality_for_percentage(self, percentage: int) -> str:
        if percentage >= 70:
            return "strong"
        if percentage >= 40:
            return "moderate"
        if percentage > 0:
            return "weak"
        return "insufficient"

    def _overall_evidence_quality(self, evidence_scores: dict[str, dict[str, Any]]) -> str:
        if not evidence_scores:
            return "insufficient"
        best = max((score.get("percentage") or 0 for score in evidence_scores.values()), default=0)
        return self._quality_for_percentage(int(best))

    def _attach_evidence_scores(
        self,
        remedies: list[dict[str, Any]],
        evidence_scores: dict[str, dict[str, Any]],
    ) -> list[dict[str, Any]]:
        enriched = []
        for remedy in remedies:
            if not isinstance(remedy, dict):
                continue
            name = remedy.get("remedy") or remedy.get("name")
            score = evidence_scores.get(name or "")
            item = dict(remedy)
            if score:
                item["evidenceScore"] = score
                item["matchPercentage"] = score["percentage"]
            enriched.append(item)
        return enriched

    def _remedy_prompt(
        self,
        symptoms: str,
        patient_summary: str,
        recent_consultations: list[dict[str, Any]],
        evidence: dict[str, Any],
    ) -> str:
        return (
            "Analyze the current case using the compact patient context and OOREP evidence below. "
            "Think through the case systematically before producing the JSON: "
            "1. TOTALITY: identify the full symptom picture present in the evidence. "
            "2. CHARACTERISTIC SYMPTOMS: identify peculiar, distinctive symptoms and modalities. "
            "3. RUBRIC MATCHING: compare each candidate against the provided rubric support and evidence scores. "
            "4. DIFFERENTIATION: explain why the primary remedy fits better than alternatives. "
            "Return only valid JSON with keys issues, differentiationLogic, and remedies. remedies must "
            "contain exactly three objects when evidence allows: rank, remedy, matchPercentage, reasoning, "
            "dosage, followUp, and evidence. matchPercentage must align with the provided computed evidenceScore; "
            "do not invent a stronger percentage. evidence must cite only rubrics or materia medica snippets "
            "provided below. Do not include hidden chain-of-thought or text outside JSON.\n\n"
            f"Patient summary:\n{patient_summary or 'No compact summary available.'}\n\n"
            f"Recent consultations:\n{json.dumps(recent_consultations, default=str)}\n\n"
            f"Current symptoms:\n{symptoms}\n\n"
            f"OOREP evidence:\n{json.dumps(evidence, default=str)}"
        )


def get_ai_advisor_service() -> AiAdvisorService:
    return AiAdvisorService()
