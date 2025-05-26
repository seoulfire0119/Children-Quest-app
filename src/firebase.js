// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔑 Firebase 콘솔에서 복사한 값으로 교체하세요
const firebaseConfig = {
  apiKey: "AIzaSyB5z7okG57RTYcyVxg6ixQhYeSqau4Y5p8",
  authDomain: "children-s-quest.firebaseapp.com",
  projectId: "children-s-quest",
  storageBucket: "children-s-quest.firebasestorage.app",
  messagingSenderId: "213554751562",
  appId: "1:213554751562:web:6bc0dd505aff89f65a1eb3",
  measurementId: "G-49P60P4J6E",
};

// ▶️ Firebase 초기화
const app = initializeApp(firebaseConfig);

// ▶️ **꼭!** 이렇게 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
