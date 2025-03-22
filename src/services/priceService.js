// src/services/priceService.js
import { db } from "./firebaseService";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

const PRICES_COLLECTION = "prices";
const PRICES_DOC_ID = "service_prices"; // Usaremos um documento fixo para simplicidade

export const priceService = {
  async getPrices() {
    ("priceService: Buscando preços");
    try {
      const pricesRef = doc(db, PRICES_COLLECTION, PRICES_DOC_ID);
      const pricesSnapshot = await getDocs(collection(db, PRICES_COLLECTION));
      let prices = { turmas: 0, escolinha: 0, avulso: 0 }; // Valores padrão

      if (!pricesSnapshot.empty) {
        const docData = pricesSnapshot.docs.find((d) => d.id === PRICES_DOC_ID);
        if (docData) {
          prices = docData.data();
        }
      }
      "priceService: Preços encontrados:", prices;
      return prices;
    } catch (error) {
      console.error("priceService: Erro ao buscar preços:", error);
      throw error;
    }
  },

  async setPrices(prices) {
    "priceService: Salvando preços:", prices;
    try {
      const pricesRef = doc(db, PRICES_COLLECTION, PRICES_DOC_ID);
      await setDoc(pricesRef, prices, { merge: true }); // Usa merge para atualizar apenas os campos fornecidos
      ("priceService: Preços salvos com sucesso");
    } catch (error) {
      console.error("priceService: Erro ao salvar preços:", error);
      throw error;
    }
  },
};
