// src/services/escolinhaService.js
import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const ESCOLINHA_COLLECTION = "escolinha";

export const escolinhaService = {
  async getAulas() {
    console.log("escolinhaService: Buscando aulas");
    const aulasCol = collection(db, ESCOLINHA_COLLECTION);
    const aulasSnapshot = await getDocs(aulasCol);
    const aulasList = aulasSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("escolinhaService: Aulas encontradas:", aulasList.length);
    return aulasList;
  },

  async addAula(aula) {
    console.log("escolinhaService: Adicionando aula:", aula);
    const createdAt = new Date().toISOString(); // Data atual em formato ISO
    const aulaComData = { ...aula, createdAt };
    const aulasCol = collection(db, ESCOLINHA_COLLECTION);
    const docRef = await addDoc(aulasCol, aulaComData);
    const novaAula = { id: docRef.id, ...aulaComData };
    console.log("escolinhaService: Aula adicionada com ID:", docRef.id);
    return novaAula;
  },

  async updateAula(id, aulaAtualizada) {
    console.log("escolinhaService: Atualizando aula:", id, aulaAtualizada);
    const aulaRef = doc(db, ESCOLINHA_COLLECTION, id);
    await updateDoc(aulaRef, aulaAtualizada);
    console.log("escolinhaService: Aula atualizada");
  },

  async deleteAula(id) {
    console.log("escolinhaService: Deletando aula:", id);
    const aulaRef = doc(db, ESCOLINHA_COLLECTION, id);
    await deleteDoc(aulaRef);
    console.log("escolinhaService: Aula deletada");
  },
};
