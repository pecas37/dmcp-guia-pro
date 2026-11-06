import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBk4MTkvggbibZOkAHf2aycRgqFHTjbc-Q",
  authDomain: "servidor-desertor.firebaseapp.com",
  databaseURL: "https://servidor-desertor-default-rtdb.firebaseio.com",
  projectId: "servidor-desertor",
  storageBucket: "servidor-desertor.appspot.com",
  messagingSenderId: "966602897456",
  appId: "1:966602897456:web:8b6a756e2d3eb967a515f5"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);