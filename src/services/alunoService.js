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
    "alunoService: Adicionando aluno:", nome;
    const alunoData = new Aluno(
      null,
      nome,
      responsavel,
      telefoneResponsavel,
      idade,
      turma,
      new Date().toISOString() // Adiciona createdAt
    ).toFirestore();
    const docRef = await addDoc(collection(db, ALUNOS_COLLECTION), alunoData);
    "alunoService: Aluno adicionado com ID:", docRef.id;
    return docRef.id;
  },
  async getAlunos() {
    ("alunoService: Buscando alunos");
    const querySnapshot = await getDocs(collection(db, ALUNOS_COLLECTION));
    const alunos = querySnapshot.docs.map((doc) => Aluno.fromFirestore(doc));
    "alunoService: Alunos encontrados:", alunos.length;
    return alunos;
  },
  async updateAluno(
    id,
    { nome, responsavel, telefoneResponsavel, idade, turma, createdAt }
  ) {
    "alunoService: Atualizando aluno:", id;
    const alunoRef = doc(db, ALUNOS_COLLECTION, id);
    await updateDoc(alunoRef, {
      nome,
      responsavel,
      telefoneResponsavel,
      idade,
      turma,
      createdAt,
    });
    "alunoService: Aluno atualizado:", id;
  },
  async deleteAluno(id) {
    "alunoService: Deletando aluno:", id;
    const alunoRef = doc(db, ALUNOS_COLLECTION, id);
    await deleteDoc(alunoRef);
    "alunoService: Aluno deletado:", id;
  },
};
