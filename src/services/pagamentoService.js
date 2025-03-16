import { db } from "./firebaseService";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { Pagamento } from "../models/Pagamento";

const PAGAMENTOS_COLLECTION = "pagamentos";

export const pagamentoService = {
  // Adicionar um pagamento
  async addPagamento(turmaId, valor, dataVencimento) {
    const pagamentoData = new Pagamento(
      null,
      turmaId,
      valor,
      dataVencimento,
      null,
      "pendente"
    ).toFirestore();
    const docRef = await addDoc(
      collection(db, PAGAMENTOS_COLLECTION),
      pagamentoData
    );
    return docRef.id;
  },

  // Obter pagamentos por turma
  async getPagamentosByTurma(turmaId) {
    const q = query(
      collection(db, PAGAMENTOS_COLLECTION),
      where("turmaId", "==", turmaId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => Pagamento.fromFirestore(doc));
  },

  // Atualizar um pagamento (ex.: marcar como pago)
  async updatePagamento(id, updates) {
    const pagamentoRef = doc(db, PAGAMENTOS_COLLECTION, id);
    await updateDoc(pagamentoRef, updates);
  },

  // Deletar um pagamento
  async deletePagamento(id) {
    const pagamentoRef = doc(db, PAGAMENTOS_COLLECTION, id);
    await deleteDoc(pagamentoRef);
  },
};
