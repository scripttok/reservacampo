// src/services/firebaseService.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCo1Zc5OlUZzM0n6pDzi9uFOLNDPx697Ys",
  authDomain: "projetocampo-3e349.firebaseapp.com",
  projectId: "projetocampo-3e349",
  storageBucket: "projetocampo-3e349.firebasestorage.app",
  messagingSenderId: "270770637962",
  appId: "1:270770637962:android:7393e3d1d46c96707ab173",
  databaseURL: "https://projetocampo-3e349-default-rtdb.firebaseio.com",
};

// Cliente Paulo henrrique
// const firebaseConfig = {
//   apiKey: "AIzaSyAWIBmk7MZ7MobzP5B81iNAEYHynQb58nc",
//   authDomain: "paulo-herrique.firebaseapp.com",
//   databaseURL: "https://paulo-herrique-default-rtdb.firebaseio.com",
//   projectId: "paulo-herrique",
//   storageBucket: "paulo-herrique.firebasestorage.app",
//   messagingSenderId: "919839358789",
//   appId: "1:919839358789:android:aad896afee048f0c8f882c",
// };

// cliente Jair
// const firebaseConfig = {
//   apiKey: "AIzaSyDRXmlkOFErKWtn-6H7MOtYbm8VrkhtteA",
//   authDomain: "campo-manager-x.firebaseapp.com",
//   projectId: "campo-manager-x",
//   storageBucket: "campo-manager-x.firebasestorage.app",
//   messagingSenderId: "23614089217",
//   appId: "1:23614089217:android:474516828c9a8cce18f800",
//   databaseURL: "https://campo-manager-x-default-rtdb.firebaseio.com",
// };

("firebaseService: Inicializando Firebase");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
("firebaseService: Firebase inicializado com sucesso");

export { db };
