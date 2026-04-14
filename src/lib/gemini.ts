import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractSymptoms(input: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the key homeopathic symptoms from the following text in high detail. Provide a comprehensive list of repertory rubrics followed by a detailed summary of the symptoms. Please format the output cleanly using plain text (use simple dashes for lists). Do NOT use any markdown formatting symbols like asterisks (*) or hashes (#). Text: ${input}`,
  });
  return response.text;
}

export async function suggestRemedies(symptoms: string, pastConsultations: any[] = []) {
  let historyContext = "";
  if (pastConsultations.length > 0) {
    historyContext = "Patient's Past Consultations (Chronological order. Use this to understand the timeline, progression of the case, and what remedies have been tried. Pay close attention to the time frame of changes to better diagnose the root cause of the current follow-up issue):\n" + 
      pastConsultations.slice().reverse().map(c => `- Date: ${new Date(c.createdAt).toLocaleDateString()}\n  Symptoms: ${c.symptoms}\n  Prescribed: ${c.prescribedRemedy} (${c.potency})\n  Notes/Diagnosis: ${c.notes}`).join('\n\n') + "\n\n";
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${historyContext}Based on the following CURRENT homeopathic symptoms, perform a rigorous homeopathic case analysis. 
1. Summarize the patient's issues and constitutional profile.
2. Provide a clear Ranking Logic for the top 3 remedies (PRIMARY, ALTERNATIVE, DIFFERENTIAL) including a calculated percentage match based on rubric match, constitutional fit, and modality alignment.
3. For each remedy, provide the rationale, proper dosage, and follow-up.
4. Provide an explicit "Differentiation Logic" (Why Not) section explaining why the Alternative and Differential remedies rank below the Primary one, specifically highlighting constitutional mismatches or missing keynotes.
Current Symptoms: ${symptoms}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          issues: { type: Type.STRING, description: "Summary of the patient's issues, symptoms, and constitutional profile" },
          differentiationLogic: { type: Type.STRING, description: "Explicit 'Why Not' section explaining why the alternative/differential remedies rank below the primary, highlighting constitutional mismatches or missing keynotes." },
          remedies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                rank: { type: Type.STRING, description: "Rank: PRIMARY, ALTERNATIVE, or DIFFERENTIAL" },
                remedy: { type: Type.STRING, description: "Name of the homeopathic remedy" },
                matchPercentage: { type: Type.NUMBER, description: "Calculated percentage match (e.g., 83.3)" },
                reasoning: { type: Type.STRING, description: "Rationale for this remedy" },
                dosage: { type: Type.STRING, description: "Proper dosage including potency and frequency (e.g., 30C twice a day)" },
                followUp: { type: Type.STRING, description: "When the patient should come back for a check-in" }
              },
              required: ["rank", "remedy", "matchPercentage", "reasoning", "dosage", "followUp"]
            }
          }
        },
        required: ["issues", "differentiationLogic", "remedies"]
      }
    }
  });
  
  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse remedies JSON", e);
    return { issues: "", differentiationLogic: "", remedies: [] };
  }
}

export async function searchMateriaMedica(query: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search the homeopathic Materia Medica for the following query and provide a concise summary of the relevant remedies and their indications. Query: ${query}`,
  });
  return response.text;
}

export async function processAudio(base64Audio: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-live-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType,
          },
        },
        {
          text: "Transcribe the audio and extract the key homeopathic symptoms.",
        },
      ],
    },
  });
  return response.text;
}

export async function processImage(base64Image: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this image (lab report or physical symptom) and extract relevant information for a homeopathic case.",
        },
      ],
    },
  });
  return response.text;
}
