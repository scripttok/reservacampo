// src/services/campoService.js
import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Campo } from "../models/Campo";

const CAMPOS_COLLECTION = "campos";

export const campoService = {
  Campo,
  async addCampo(nome) {
    console.log("campoService: Adicionando campo:", nome);
    const campoData = new Campo(null, nome).toFirestore();
    const docRef = await addDoc(collection(db, CAMPOS_COLLECTION), campoData);
    console.log("campoService: Campo adicionado com ID:", docRef.id);
    return docRef.id;
  },
  async getCampos() {
    console.log("campoService: Buscando campos");
    const querySnapshot = await getDocs(collection(db, CAMPOS_COLLECTION));
    const campos = querySnapshot.docs.map((doc) => Campo.fromFirestore(doc));
    console.log("campoService: Campos encontrados:", campos.length);
    return campos;
  },
  async updateCampo(id, nome) {
    console.log("campoService: Atualizando campo:", id, nome);
    const campoRef = doc(db, CAMPOS_COLLECTION, id);
    await updateDoc(campoRef, { nome });
    console.log("campoService: Campo atualizado:", id);
  },
  async deleteCampo(id) {
    console.log("campoService: Deletando campo:", id);
    const campoRef = doc(db, CAMPOS_COLLECTION, id);
    await deleteDoc(campoRef);
    console.log("campoService: Campo deletado:", id);
  },
};
