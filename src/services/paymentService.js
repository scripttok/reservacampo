// src/services/paymentService.js
import { db } from "./firebaseService";
import { collection, getDocs, addDoc } from "firebase/firestore";

const PAYMENTS_COLLECTION = "payments";

export const paymentService = {
  async getPayments() {
    ("paymentService: Buscando pagamentos");
    try {
      const querySnapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
      const payments = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      "paymentService: Pagamentos encontrados:", payments.length;
      return payments;
    } catch (error) {
      console.error("paymentService: Erro ao buscar pagamentos:", error);
      throw error;
    }
  },

  async addPayment(payment) {
    "paymentService: Adicionando pagamento:", payment;
    try {
      const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), payment);
      "paymentService: Pagamento adicionado com ID:", docRef.id;
      return docRef.id;
    } catch (error) {
      console.error("paymentService: Erro ao adicionar pagamento:", error);
      throw error;
    }
  },
};
