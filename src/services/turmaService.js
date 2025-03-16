// src/services/turmaService.js
import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const TURMAS_COLLECTION = "turmas";

export const turmaService = {
  async getTurmas() {
    console.log("turmaService: Buscando turmas");
    const turmasCol = collection(db, TURMAS_COLLECTION);
    const turmasSnapshot = await getDocs(turmasCol);
    const turmasList = turmasSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("turmaService: Turmas encontradas:", turmasList.length);
    return turmasList;
  },

  async addTurma(turma) {
    console.log("turmaService: Adicionando turma:", turma);
    const createdAt = new Date().toISOString(); // Data atual em formato ISO
    const turmaComData = { ...turma, createdAt };
    const turmasCol = collection(db, TURMAS_COLLECTION);
    const docRef = await addDoc(turmasCol, turmaComData);
    console.log("turmaService: Turma adicionada com ID:", docRef.id);
  },

  async updateTurma(id, turma) {
    console.log("turmaService: Atualizando turma:", id, turma);
    const turmaRef = doc(db, TURMAS_COLLECTION, id);
    await updateDoc(turmaRef, turma);
    console.log("turmaService: Turma atualizada");
  },

  async deleteTurma(id) {
    console.log("turmaService: Deletando turma:", id);
    const turmaRef = doc(db, TURMAS_COLLECTION, id);
    await deleteDoc(turmaRef);
    console.log("turmaService: Turma deletada");
  },
};
