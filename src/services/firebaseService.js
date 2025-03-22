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

("firebaseService: Inicializando Firebase");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
("firebaseService: Firebase inicializado com sucesso");

export { db };
