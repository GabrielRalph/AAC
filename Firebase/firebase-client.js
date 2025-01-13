import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'
import {getAuth, signInAnonymously, signInWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
import {update, getDatabase, child, push, ref as _ref, get, onValue, onChildAdded, onChildChanged, onChildRemoved, set, off,
       query, endAt, endBefore, equalTo, startAfter, orderByKey, orderByValue, orderByChild, limitToFirst, limitToLast } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js'
import { getFunctions, httpsCallable  } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js'
import { getStorage, ref as sref, uploadBytesResumable, getDownloadURL, getBlob, getMetadata } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js'

window.signIn =(a,b) => signInWithEmailAndPassword(Auth, a,b);
const firebaseConfig = {
    apiKey: "AIzaSyChiEAP1Rp1BDNFn7BQ8d0oGR65N3rXQkE",
    authDomain: "eyesee-d0a42.firebaseapp.com",
    databaseURL: "https://eyesee-d0a42-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "eyesee-d0a42",
    storageBucket: "eyesee-d0a42.appspot.com",
    messagingSenderId: "56834287411",
    appId: "1:56834287411:web:999340ed2fd5165fa68046"
  };
const storageURL = "gs://eyesee-d0a42.appspot.com"

let initialised = false;
let App = null;
let Database = null;
let Functions = null;
let Auth = null;
let User = null;
let StateListeners = [];
let waitForUserProm = null;

// Generates a random key to use as the device's unique identifier DUID.
function makeRandomKey(){
  return  (Math.round(Math.random() * 100000)).toString(32) + Math.round(performance.now() * 1000).toString(32) + (Math.round(Math.random() * 100000)).toString(32);
}

/* If a DUID already exists in local storage retreive that key otherwise generate a new key 
   and store in local storage. */ 
let DUID = localStorage.getItem('duid');
if (DUID == null) {
  DUID = makeRandomKey();
  localStorage.setItem('duid', DUID);
}

/* If the user has changed updates the new user and calls all listeners with the new user data.
   If a listener returns the string "remove" then the listener will be removed */
function authChangeHandler(user){
  // If the user has changed
  if (!(user != null && User != null && user.uid == user.uid)) {
    // Update the user object
    User = user;
    let newListeners = [];
    // Call listeners with the new user
    for (let obj of StateListeners) {
      if (obj instanceof Function) {
        if (obj(user) != "remove") newListeners.push(obj);
      } else if (typeof obj === 'object' && obj !== null) {
        if (obj.onauthchange instanceof Function) {
          if (obj.onauthchange(user) != "remove") newListeners.push(obj);
        }
      }
    }
    StateListeners = newListeners;
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ PUBLIC FUNCTIONS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/*  Initialize firebase, initializes the firebase app with the given configuration
    after initializing wait for an auth state change and return */
export async function initialise(config = firebaseConfig) {
  if (initialised) return await waitForUserProm;
  initialised = true;
  App = initializeApp(config);
  Database = getDatabase(App);
  Auth = getAuth();
  Functions = getFunctions(App, "australia-southeast1");

  waitForUserProm = new Promise((resolve, reject) => {
    let init = true;
    onAuthStateChanged(Auth, async (userData) => {
      if (userData == null) {
      } else {
        // console.log("auth state change: user data", userData);
        if (init) {
          init = false;
        }
        authChangeHandler(userData);
      }
      resolve(userData);
    });
  });
  return await waitForUserProm;
}
  
//  Add an auth state change listener
export function addAuthChangeListener(obj) {
  StateListeners.push(obj);
}

// Get user uid, if none exists then the DUID is returned instead
export function getUID(){
  let uid = DUID;
  if (User != null && typeof User !== "string") {
    uid = User.uid;
  }
  return uid;
}

// Get user data object
export function getUser(){return User;}

// Get App object
export function getApp(){return App;}

// Get Database object
export function getDB(){return Database; }

// Get Ref using database
export function ref(path) {return _ref(Database, path);}

export async function callFunction(name, data) {
  let res = null;
  if (Functions){
    const func = httpsCallable(Functions, name);
    res = await func(data);
  }
  return res;
}

// Upload file to firebase storage bucket
export async function uploadFileToCloud(file, path, statusCallback, metadata, getURL = true) {
  let Storage = getStorage(App, storageURL);

  // path = `${path}`
  console.log("uploading file of size", (file.size / 1e6) + "MB");

  if (!(file instanceof File) || typeof path !== 'string') {
      console.log('invalid file');
      return null;
  }

  if (!(statusCallback instanceof Function))
      statusCallback = () => { }

  let sr = sref(Storage, path);

  let uploadTask = uploadBytesResumable(sr, file, metadata);
  uploadTask.on('next', statusCallback)
  await uploadTask;

  if (getURL) {
      let url = await getDownloadURL(sr);
      return url;
  }
  return null
}

export async function getFile(path) {
  let Storage = getStorage(App, storageURL);
  let sr = sref(Storage, path);
  let data = await getMetadata(sr)
  console.log(data);
  return await getBlob(sr);
}

export {update, child, get, push, set, onChildAdded, onChildRemoved, onChildChanged, onValue, query, endAt, endBefore, equalTo, startAfter, orderByKey, orderByValue, orderByChild, limitToFirst, limitToLast}
