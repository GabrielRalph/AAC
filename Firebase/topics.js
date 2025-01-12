/**
 * @typedef {("normal"|"starter"|"topic")} GItemType
 */

/**
 * @typedef {("2x1"|"2x2"|"3x2"|"3x3"|"4x3")} GridSize
 */

/**
 * @typedef {Object} GItem
    * @property {GItemType} type one of the three item types
    * @property {string} symbol the symbol image shown
    * @property {string} displayValue the value displayed
    * @property {?string} utterance will take the value of displayValue if not included
    * @property {?string} topicUID topic id 
 */

/**
 * @typedef {Object} GTopic
    * @property {string} name
    * @property {GridSize} size
    * @property {[GItem]} items
    * @property {?string} uid
    * 
 */

/**
 * @typedef {Object} GTopicDescriptor
 * @property {string} name
 * @property {GridSize} size
 * @property {string} uid
 */

import {push, set, child, equalTo, getUID, onChildAdded, onChildChanged, onChildRemoved, orderByChild, query, ref, update, initialise as _init, get} from "./firebase-client.js"
/**
 * @type {Object.<GridSize, function>}
 */
const GRID_SIZES = {
    "2x1": ()=>[2,1],
    "2x2": ()=>[2,2],
    "3x2": ()=>[3,2],
    "3x3": ()=>[3,3],
    "4x3": ()=>[4,3]
}
const MAX_ITEMS = 4 * 3;

const GITEM_TYPES = {
    "normal": "word",
    "starter": "word",
    "topic": "topic",
}

let TOPICS = {};
let updateCallbacks = [];
let databaseWatchers = [];


/** parses and copies a GItem
 * @param {GItem} item
 * @param {boolean} withErrors
 * 
 * @return {GItem}
 */
function parseAndCopyGItem(item, withErrors = false) {
    let parsedItem = {};
    
    if (typeof item !== 'object' || item === null) {
        item = {}
        if (withErrors) throw "Invalid GItem.";
    }

    if (item.hidden) {
        parsedItem.hidden = true;
    } else {
        parsedItem.hidden = false;
        let {displayValue, utterance, type, topicUID, symbol} = item;
        
        if (typeof displayValue === "string" && displayValue.length > 0){
            parsedItem.displayValue = item.displayValue;
        } else {
            parsedItem.displayValue = "";
            if (withErrors) throw "Non hidden GItem must have a non empty string for it's display value."
        }
    
        if (typeof symbol === "object" && symbol !== null) {
            parsedItem.symbol = {
                url: typeof symbol.url === "string" ? symbol.url : "",
                id: typeof symbol.id === "string" ? symbol.id : "",
            };
        }
        else parsedItem.symbol = {
            url: "",
            id: "",
        };
    
        if (typeof utterance === "string") parsedItem.utterance = utterance;
        else parsedItem.utterance = parsedItem.displayValue;
        
        if (typeof type === "string" && type in GITEM_TYPES)
            parsedItem.type = type;
        else {
            parsedItem.type = "normal"
            if (withErrors) throw "Non hidden GItem must have a valid type."
        }
    
        if (parsedItem.type == "topic") {
            if (typeof topicUID == "string"){
                parsedItem.topicUID = topicUID;
                if (withErrors && !hasTopic(topicUID)) {
                    throw `A GITem with type 'topic' must contain a valid linking topic. No topic has the topic UID ${item.topicUID}.`
                }
            } else if (parsedItem.type == "topic" && withErrors) {
                throw "A GItem with type 'topic' must have a linking topic UID."
            }
        }
    }

    
    return parsedItem;
}

/**
 * @param {GTopic} topic
 * 
 * @return {GTopic}
 */
function parseAndCopyTopic(topic){
    if (typeof topic !== "object" || topic === null) {
        throw "Invalid topic."
    }

    let parsedTopic = {
		owner: getUID()
	}

    if (typeof topic.name !== "string") {
        throw "Topic name must be a string."
    }
    if (topic.name.length == 0) {
        throw "Topic name bust be non empty string."
    }
    parsedTopic.name = topic.name;


    if (!(topic.size in GRID_SIZES)) {
        throw `Invalid "${topic.size}" is not a valid topic size.`
    }
    parsedTopic.size = topic.size;

    if (!Array.isArray(topic.items)) {
        throw `Topic must contain an array of items, but items field was assigned ${topic.items}.`
    }

    let [rows, cols] = getGridSize(topic.size);
    let total = rows * cols;
    if (topic.items.length < total) {
        throw `Topic with size ${topic.size} must contain at least ${total} items but only had ${topic.items.length} items.`
    }

    parsedTopic.starter = !!topic.starter;
	parsedTopic.public = !!topic.public;

    let errorItem = null;
    parsedTopic.items = topic.items.slice(0, total).map((gItem, i) => {
        try {
            return parseAndCopyGItem(gItem, true)
        } catch (e) {
            errorItem = [e, i]
        }
    }) 

    if (errorItem != null) {
        throw `The GItem at index ${errorItem[1]} was invalid: ${errorItem[0]}`
    }

    
    return parsedTopic;
}


function callUpdates(){
    for (let cb of updateCallbacks) cb();
}


function topicsRef(path) {
	let base = ref("grid-topics")
	if (typeof path === "string" && path.length > 0) {
		base = child(base, path);
	}
	return base;
}


/**
 * @return {GItem}
 */
function getEmptyItem(){
    return {
        displayValue: "",
        utterance: "",
        symbol: {
            url: "",
            id: "",
        },
        type: "normal",
        hidden: true,
    }
}

/**
 * @return {GTopic}
 */
export function getEmptyTopic() {
    return {
		public: false,
		owner: getUID(),
        name: "",
        size: "4x3",
        starter: false,
        topicUID: "new",
        items: new Array(MAX_ITEMS).fill(0).map(i => getEmptyItem())
    }
}

/**
 * @param {function} callback
 * 
 * @return {function} unsubscriber
 */
export function onTopicsUpdate(callback){
    if (callback instanceof Function) {
        updateCallbacks.push(callback)
        
        return () => {
            let update = [];
            for (let cb of updateCallbacks) {
                if (cb !== callback) {
                    update.push(cb)
                }
            }
            updateCallbacks = update;
        }
    }
}



/** get grid size returns the number of columns and rows in the grid
 * given by the grid size string provided. 
 * @param {GridSize} string
 * 
 * @return {[number, number]}
 */
export function getGridSize(string) {
    let size = [4,3];
    if (typeof string === "string" && string in GRID_SIZES) {
        size = GRID_SIZES[string]();
    }
    return size;
}

/** Returns the list of all possible gridSizes
 * @return {[GridSize]}
 */
export function getGridSizes(){
    return Object.keys(GRID_SIZES);
}

/**
 * @return {[GItemType]}
 */
export function getGItemTypes() {
    return Object.keys(GITEM_TYPES)
}

/** Returns a list of topic descriptors
 * @return {[GTopicDescriptor]}
 */
export function getTopics(onlyOwned){
    let topics = [];
	let uid = getUID();
    for (let topicUID in TOPICS) {
		let topic = TOPICS[topicUID];
		if (!onlyOwned || topic.owner == uid) {
			let {name, size, starter, owner} = topic
			topics.push({name, size, topicUID, starter: starter, public: topic.public, owned: owner == uid});
		}
    }
    return topics;
}

/**
 * @param {string} topicUID
 * @return {GTopic}
 */
export function getTopic(topicUID){
    let topic = null
    if (topicUID in TOPICS) {
		let topic0 =  TOPICS[topicUID];
        let {name, size, items, starter} = topic0;
        topic = {name, size, topicUID, starter: starter, public: topic0.public}
        let setItems = items.map(gItem => parseAndCopyGItem(gItem));
        let allItems = new Array(MAX_ITEMS).fill(getEmptyItem).map(a=>a())
        setItems.forEach((item, i) => {
            if (!item.hidden) {
                allItems[i] = item;
            }
        })
        topic.items = allItems;
    }

    return topic;
}

/**
 * @param {string} topicUID
 * 
 * @return {boolean}
 */
export function hasTopic(topicUID){
    return typeof topicUID === "string" && topicUID in TOPICS;
}

/**
 * @param {GTopic} topic
 */
export function addTopic(topic) {
    topic = parseAndCopyTopic(topic);

	console.log(topic);
	
    let pushRef = push(topicsRef());
	set(pushRef, topic);
}

/**
 * @param {GTopic} topic
 */
export function updateTopic(topic) {
    if (typeof topic !== "object" || topic === null) {
        throw "Invalid topic."
    }

    let uid = topic.topicUID;
    if (uid === "new") {
        addTopic(topic);
        return;
    } else if (!hasTopic(uid)) {
        throw `No topic with id ${uid} exists.`
    }

    topic = parseAndCopyTopic(topic);
	update(topicsRef(uid), topic);
}


export async function initialise(){
	await _init();
	
    let publicQuery = query(topicsRef(), orderByChild('public'), equalTo(true));
	let ownedQuery = query(topicsRef(), orderByChild('owner'), equalTo(getUID()));


	for (let [type, query] of [["public", publicQuery], ["owned", ownedQuery]]) {


		databaseWatchers.push(onChildAdded(query, (snapshot) => {
			let topicUID = snapshot.key;
			TOPICS[topicUID] = snapshot.val();
			console.log(type, "add", topicUID, snapshot.val().name);
			callUpdates();
		}))
		databaseWatchers.push(onChildChanged(query, (snapshot) => {
			let topicUID = snapshot.key;
			TOPICS[topicUID] = snapshot.val();
			console.log(type, "change", topicUID, snapshot.val().name);
			
			callUpdates();
		}))
		databaseWatchers.push(onChildRemoved(query, (snapshot) => {
			let topicUID = snapshot.key;
			delete TOPICS[topicUID]
			console.log(type, "delete", topicUID, snapshot.val().name);
			callUpdates();
		}))
	}
}


