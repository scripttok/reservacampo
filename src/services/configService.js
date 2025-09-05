// src/services/configService.js
import { db } from "./firebaseService";
import { setDoc, doc, getDoc } from "firebase/firestore";

const CONFIG_COLLECTION = "configuracoes"; // <-- PLURAL
const HORARIO_DOC_ID = "horarios";

export const configService = {
  async setHorarioFuncionamento(inicio, fim) {
    console.log(
      "configService: Definindo horário de funcionamento:",
      inicio,
      fim
    );
    const configRef = doc(db, CONFIG_COLLECTION, HORARIO_DOC_ID);
    await setDoc(configRef, { inicio, fim }, { merge: true });
    console.log("configService: Horário de funcionamento salvo");
  },

  async getHorarioFuncionamento() {
    console.log(
      "configService: Buscando horário de funcionamento em",
      `${CONFIG_COLLECTION}/${HORARIO_DOC_ID}`
    );

    // Caminho correto
    const configRef = doc(db, CONFIG_COLLECTION, HORARIO_DOC_ID);
    try {
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data();
        console.log("configService: Encontrado no Firestore:", data);
        return data;
      }

      // (Opcional) tentativa de legado, caso ainda exista dado no singular
      const legacyRef = doc(db, "configuracao", HORARIO_DOC_ID);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        const data = legacySnap.data();
        console.warn(
          "configService: Lido no caminho legado configuracao/horarioFuncionamento. Migre para configuracoes/horarioFuncionamento."
        );
        return data;
      }

      console.warn("configService: Documento não encontrado. Usando padrão.");
      return { inicio: "09:00", fim: "23:00" };
    } catch (error) {
      console.error("configService: Erro ao buscar horário:", error);
      return { inicio: "09:00", fim: "23:00" };
    }
  },
};
