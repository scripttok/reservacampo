// src/services/configService.js
import { db } from "./firebaseService";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

const CONFIG_COLLECTION = "configuracao";

export const configService = {
  async setHorarioFuncionamento(inicio, fim) {
    console.log(
      "configService: Definindo horário de funcionamento:",
      inicio,
      fim
    );
    const configRef = doc(db, CONFIG_COLLECTION, "horarioFuncionamento");
    await setDoc(configRef, { inicio, fim }, { merge: true });
    console.log("configService: Horário de funcionamento salvo");
  },

  async getHorarioFuncionamento() {
    console.log("configService: Buscando horário de funcionamento");
    const configRef = doc(db, CONFIG_COLLECTION, "horarioFuncionamento");
    const snapshot = await getDocs(collection(db, CONFIG_COLLECTION));
    let horario = { inicio: "09:00", fim: "23:00" }; // Padrão inicial
    snapshot.forEach((doc) => {
      if (doc.id === "horarioFuncionamento") {
        horario = doc.data();
      }
    });
    console.log("configService: Horário encontrado:", horario);
    return horario;
  },
};
