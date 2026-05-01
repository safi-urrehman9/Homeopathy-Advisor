from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


def _uuid() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


class Doctor(db.Model):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    patients: Mapped[List["Patient"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")
    consultations: Mapped[List["Consultation"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")
    appointments: Mapped[List["Appointment"]] = relationship(back_populates="doctor", cascade="all, delete-orphan")

    def to_auth_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "photoUrl": self.photo_url or "",
            "createdAt": isoformat(self.created_at),
            "updatedAt": isoformat(self.updated_at),
        }


class Patient(db.Model):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    doctor: Mapped[Doctor] = relationship(back_populates="patients")
    consultations: Mapped[List["Consultation"]] = relationship(back_populates="patient", cascade="all, delete-orphan")
    appointments: Mapped[List["Appointment"]] = relationship(back_populates="patient", cascade="all, delete-orphan")

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "doctorId": self.doctor_id,
            "name": self.name,
            "age": self.age,
            "gender": self.gender or "",
            "phone": self.phone or "",
            "email": self.email or "",
            "history": self.history or "",
            "createdAt": isoformat(self.created_at),
            "updatedAt": isoformat(self.updated_at),
        }


class Consultation(db.Model):
    __tablename__ = "consultations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    symptoms: Mapped[str] = mapped_column(Text, nullable=False)
    repertorization: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prescribed_remedy: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    potency: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    doctor: Mapped[Doctor] = relationship(back_populates="consultations")
    patient: Mapped[Patient] = relationship(back_populates="consultations")

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "doctorId": self.doctor_id,
            "patientId": self.patient_id,
            "date": isoformat(self.date),
            "symptoms": self.symptoms,
            "repertorization": self.repertorization or "",
            "prescribedRemedy": self.prescribed_remedy or "",
            "potency": self.potency or "",
            "notes": self.notes or "",
            "createdAt": isoformat(self.created_at),
        }


class Appointment(db.Model):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctors.id"), index=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="scheduled", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    doctor: Mapped[Doctor] = relationship(back_populates="appointments")
    patient: Mapped[Patient] = relationship(back_populates="appointments")

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "doctorId": self.doctor_id,
            "patientId": self.patient_id,
            "patientName": self.patient_name,
            "date": isoformat(self.date),
            "status": self.status,
            "notes": self.notes or "",
            "createdAt": isoformat(self.created_at),
            "updatedAt": isoformat(self.updated_at),
        }
