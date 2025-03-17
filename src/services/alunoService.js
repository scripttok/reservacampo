// src/services/alunoService.js
import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Aluno } from "../models/Aluno";

const ALUNOS_COLLECTION = "alunos";

export const alunoService = {
  Aluno,
  async addAluno({ nome, responsavel, telefoneResponsavel, idade, turma }) {
    console.log("alunoService: Adicionando aluno:", nome);
    const alunoData = new Aluno(
      null,
      nome,
      responsavel,
      telefoneResponsavel,
      idade,
      turma
    ).toFirestore();
    const docRef = await addDoc(collection(db, ALUNOS_COLLECTION), alunoData);
    console.log("alunoService: Aluno adicionado com ID:", docRef.id);
    return docRef.id;
  },
  async getAlunos() {
    console.log("alunoService: Buscando alunos");
    const querySnapshot = await getDocs(collection(db, ALUNOS_COLLECTION));
    const alunos = querySnapshot.docs.map((doc) => Aluno.fromFirestore(doc));
    console.log("alunoService: Alunos encontrados:", alunos.length);
    return alunos;
  },
  async updateAluno(
    id,
    { nome, responsavel, telefoneResponsavel, idade, turma }
  ) {
    console.log("alunoService: Atualizando aluno:", id);
    const alunoRef = doc(db, ALUNOS_COLLECTION, id);
    await updateDoc(alunoRef, {
      nome,
      responsavel,
      telefoneResponsavel,
      idade,
      turma,
    });
    console.log("alunoService: Aluno atualizado:", id);
  },
  async deleteAluno(id) {
    console.log("alunoService: Deletando aluno:", id);
    const alunoRef = doc(db, ALUNOS_COLLECTION, id);
    await deleteDoc(alunoRef);
    console.log("alunoService: Aluno deletado:", id);
  },
};
