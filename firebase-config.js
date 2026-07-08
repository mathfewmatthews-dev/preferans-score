// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWFMvkkrYidu7cFkldRA0wER_3vgXFT_Y",
  authDomain: "preferans-score.firebaseapp.com",
  projectId: "preferans-score",
  storageBucket: "preferans-score.firebasestorage.app",
  messagingSenderId: "388202811968",
  appId: "1:388202811968:web:8ecd362723478d87f145a5",
  measurementId: "G-XLZRLHLXMN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);