/**
 * @typedef {import("../Firebase/topics.js").GTopic} GTopic
 * @typedef {import("../Firebase/topics.js").GTopicDescriptor} GTopicDescriptor
 * @typedef {import("../Firebase/topics.js").GItem} GItem
 */

import {SvgPlus} from "../SvgPlus/4.js"
import * as Topics from "../Firebase/topics.js"
import { CommsGrid, GridIconSymbol } from "./grid.js";
import { bestImageSearch, SearchWidget } from "./symbol-search.js";
import { WBlock, ToggleInput, ResizeWatcher, PopupPromt, WBInput, attachScrollWatcher} from "../Utilities/shared.js";
import { Icon } from "../Icons/icons.js";

function compare(a, b) {
    let getst = t => (t.owned ? "a" : "b") + (t.public ? "a" : "b")
    let [ast, bst] = [getst(a), getst(b)];
    if (ast == bst) {
        return a.topicUID > b.topicUID ? -1 : 1;
    } else {
        return ast > bst ? 1 : -1;
    }
}

class EditPanel extends SvgPlus {
    _topic = null;

    /** @type {CommsGrid} */
    grid = null;

    /** @type {GridEditor} */
    gridEditor = null;

    constructor(gridEditor) {
        super('div')
        this.class = "edit-panel"

        /** @type {CommsGrid} */
        this.grid = gridEditor.grid;

        this.gridEditor = gridEditor;

        this.grid.events = {
            "icon-select": (e) => {    
                if (this.topic != null) {
                    let idx = e.selectedIconIndex;
                    let item = this.topic.items[idx];
                    this.selectItem(item,idx);
                }
            },
            "icon-drag": (e) => {
                let src = e.sourceIndex;
                let target = e.targetIndex;
                this.swapItem(src, target);
                
            }
        }
    }

    validateItem(inputs) {
        let valid = true;
        if (!inputs.hidden.value) {
            if (!inputs.displayValue.value) { 
                valid = false;
                inputs.displayValue.toggleAttribute('error', true);
            }

            if (!inputs.type.value) { 
                valid = false;
                inputs.type.toggleAttribute('error', true);
            }

            if (Topics.isTopicItem(inputs.type.value)) {
                if (!inputs.topicUID.value) {
                    inputs.topicUID.toggleAttribute('error', true);
                    valid = false;
                }
            }
        }
        return valid;
    }

    validateTopic(inputs) {
        let valid = true;
        if (!inputs.name.value) {
            inputs.name.toggleAttribute('error', true);
            valid = false;
        }

        if (!inputs.size.value) {
            inputs.size.toggleAttribute('error', true);
            valid = false;
        }

        return valid;
    }

    swapItem(src, target) {
        if (this.topic) {
            let dummy = this.topic.items[target];
            this.topic.items[target] = this.topic.items[src];
            this.topic.items[src] = dummy;
            this.grid.currentGrid.topic = this.topic;
            this.grid.unselectIcon();
            this.showTopicSettings();
        }
    }

    /** 
     * @param {GItem} item 
     */
    selectItem(item) {
        this.innerHTML = "";

        let url2symbol = (url) => {
            if (typeof url == "string") {
                let match = url.match(/icons%2Fall%2F([^?]+)\?/);
                let id = "-"
                if (match) id = match[1];
                return {url, id};
            } else {
                return {url: "", id: ""};
            }
        }
        let topicUIDS = Topics.getTopics();
        topicUIDS.sort(compare)
        topicUIDS = topicUIDS.map(t => [t.name + ' - ' + t.ownerName, t.topicUID]);
        let types = Topics.getGItemTypes().map(t => [t + (t == "topic" ? " (no utterance)" : ""), t])
        let inputs = {
            hidden: {name: "Hidden", defaultValue: item.hidden, type: "toggle"},
            displayValue: {name: "Display Value", defaultValue: item.displayValue, type: "text"},
            utterance: {name: "Utterance <i style='font-size:0.8em'>If different from display value</i>", defaultValue: item.utterance, type: "text"},
            symbol: {name: "Icon Symbol", type: "imageSelect", defaultValue: item.symbol.url,
                parser: url2symbol,
            },
            type: {name: "Type", options: types, defaultValue: item.type, type: "selection"},
            topicUID: {name: "Topic", options: topicUIDS, defaultValue: item.topicUID, type: "selection"},
        }

        for (let k in inputs) {
            let input = this.createChild(WBInput, {events: {
                focus: () => input.toggleAttribute("error", false)
            }}, inputs[k])
            inputs[k] = input;
        }


        let {type, hidden, symbol, displayValue} = inputs;

        let oldval = displayValue.value;
        displayValue.events = {
            change: async () => {
                let newVal = displayValue.value;
                if (oldval != newVal) {
                    symbol.value = await bestImageSearch(newVal, this)
                }
                
            }
        }

        type.events = {change: () => this.setAttribute("type", Topics.isTopicItem(type.value) ? "topic":type.value)}
        this.setAttribute("type", Topics.isTopicItem(type.value) ? "topic":type.value)

        hidden.events = {change: () => this.toggleAttribute("i-hidden", hidden.value)}
        this.toggleAttribute("i-hidden", hidden.value)

        symbol.events = {click: () => symbol.input.searchQuery()}

        let row = this.createChild("div", {class: "row bigger"})
        row.createChild("button", {events: {
            click: () => {
                if (this.validateItem(inputs)) {
                    for (let key in inputs) {
                        item[key] = inputs[key].value;
                    }
                    console.log(item);
                    
                    this.grid.currentGrid.topic = this.topic;
                    this.grid.unselectIcon();
                    this.showTopicSettings();
                }
            }
        }}).createChild(Icon, {}, "tick")
        
        row.createChild("button", {events: {
            click: () => {
                this.grid.unselectIcon()
                this.showTopicSettings();
            }
        }}).createChild(Icon, {}, "close")
    }

    showTopicSettings(){
        let {topic} = this;
        this.innerHTML = "";
        this.toggleAttribute("type", false)
        this.toggleAttribute("i-hidden", false)
        
        if (topic != null) {
            let name = this.createChild(WBInput, {events: {
                change: () => {
                    topic.name = name.value;
                },
                focus: () => name.toggleAttribute("error", false)
            }}, {type: "text", name: "Topic Name", defaultValue: topic.name});
        
            let size = this.createChild(WBInput, {events: {
                change: () => {
                    topic.size = size.value;
                    this.grid.topic = topic;
                },
                focus: () => size.toggleAttribute("error", false)
            }}, {name: "Grid Size", type: "selection", options: Topics.getGridSizes(), defaultValue: topic.size})

            let isPublic = this.createChild(WBInput, {events: {
                change: () => {
                    topic.public = isPublic.value
                },
            }}, {name: "Public", type: "toggle", defaultValue: topic.public});

            let isAdd = topic.topicUID == "new"
            let row = this.createChild("div", {class: "row bigger"})
            row.createChild("button", {events: {
                click: () => {
                    if (this.validateTopic({name, size})) {
                        if (isAdd) {
                            this.dispatchEvent(new Event("add"))
                        } else {
                            this.dispatchEvent(new Event("save"))
                        }
                    }
                }
            }}).createChild(Icon, {}, "save");


            row.createChild("button", {events: {
                click: () => {
                    this.dispatchEvent(new Event("cancel"))
                }
            }}).createChild(Icon, {}, "close")
        }
    }

    set topic(topic){
        this._topic = topic;
        this.showTopicSettings();
    }

    get topic(){
        return this._topic;
    }
}

class TopicsList extends SvgPlus {
    lastSelected = null;
    topicIcons = {};

    constructor() {
        super("div");
        this.class = "topics-list"
        // Add logo at top
        // this.createChild("img", {src: "https://grids.squidly.com.au/Assets/logo-banner.svg"})

        // Create WBlobck
        let wblock = this.createChild(WBlock);
        this.wblock = wblock;

        
        // Create header
        let r = wblock.head.createChild("div", {class: "row topics-head bigger"});
        r.createChild("span", {content: "Topics"})
        r.createChild("button", {events: {
            click: () => this.dispatchEvent(new Event("add"))
        }}).createChild(Icon, {}, "add")

        let searchInput = wblock.head.createChild("input",{ events: {
            input: () => {
                this.filterTopics(searchInput.value)
            }
        }})

        attachScrollWatcher(wblock.main);
        

        // Deselect if no icon is clicked
        wblock.main.onclick = () => this.selectTopic(null, true);

        // Create edit and trash buttons.
        let buttons = this.createChild("div", {class: "topics-buttons row bigger"});
        ["copy", "trash", "edit"].forEach(key => {
            buttons.createChild("button", {type: key, events: {
                click: () => this.dispatchEvent(new Event(key))
            }}).createChild(Icon, {}, key);
        })

        // Update the list when topics change
        Topics.onTopicsUpdate(() => this.topics = Topics.getTopics())
    }

    filterTopics(searchPhrase) {
        let isMatch = (a, b) => a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
        /**
         * @param {{topic: GTopicDescriptor}} icon
         */
        let isFullMatch = (icon, b) => {
            if (typeof b !== "string" || b === "") {
                return true;
            } else {
                let a1 = icon.topic.name.toLowerCase();
                let a2 = icon.topic.ownerName.toLowerCase();
                b = b.toLowerCase();
                return isMatch(a1, b) || isMatch(a2, b)
            }
        }

        let topicIcons = Object.values(this.topicIcons);
        
        topicIcons.forEach(icon => {
            icon.toggleAttribute("hide", !isFullMatch(icon, searchPhrase))
        })
    }

    /**
     * @param {string} topicUID
     * @param {boolean} emit whether to fire the select event event
     */
    selectTopic(topicUID, emit = false) {
        if (this.lastSelected !== topicUID) {
            if (this.lastSelected in this.topicIcons) {
                this.topicIcons[this.lastSelected].toggleAttribute("selected", false);
            }
    
            if (topicUID in this.topicIcons) {
                let tIcon = this.topicIcons[topicUID]
                tIcon.toggleAttribute("selected", true);
                this.toggleAttribute("selected", true)
                this.toggleAttribute("owned", tIcon.owned)
            } else {
                this.toggleAttribute("selected", false)
                this.toggleAttribute("owned", false);
            }
            this.lastSelected = topicUID;
    
            if (emit) {
                let event = new Event("select");
                event.topicUID = topicUID;
                this.dispatchEvent(event)
            }
        }
    }

    get selected(){
        return this.lastSelected;
    }

    /** Sorts topics and renders topic list
     * @param {GTopicDescriptor[]}
     * */
    set topics(topics){
        let {main} = this.wblock
        
        // Sort by owned then starter then public the date/
        topics.sort(compare);

        // Store sorted topics.
        this._topics = topics;

        // Render topics
        main.innerHTML = "";
        let topicIcons = {}
        for (let topic of topics) {
            // Create topic icon.
            let ticon = main.createChild("div", {
                class: "topic-name-title",
                events: {
                    /** @param {MouseEvent} e */
                    click: (e) => {
                        e.stopPropagation();
                        this.selectTopic(topic.topicUID, true)
                    }
                }
            });
            ticon.topic = topic;
            let text = ticon.createChild("span", {content: topic.name});
            text.createChild("i", {content: "<br>" + topic.ownerName })
        
            // Create indicator icons for each condition (owned, public and starter).
            let indicators = ticon.createChild("div", {class: "indicators"})
            ticon.toggleAttribute("public", topic.public);
            ticon["public"] = topic["public"];
            ticon.owned = topic.owned;
            indicators.createChild("div", {class: "indicator", type: "public"})

            // If it is the current selected topic, select it.
            if (this.selected == topic.topicUID) ticon.toggleAttribute("selected", true);

            // Store reference by topicUID.
            topicIcons[topic.topicUID] = ticon;
        }
        // Store reference map.
        this.topicIcons = topicIcons;
    }

    /** @return {GTopicDescriptor[]} */
    get topics(){
        return this._topics;
    }
}

export class GridEditor extends ResizeWatcher {
    /** @type {CommsGrid} */
    grid = null;

    /** @type {TopicsList} */
    topicsList = null;

    constructor(){
        super("grid-editor");
        this.symbolSeach = this.createChild(SearchWidget, {}, this);

        let topicsList = this.createChild(TopicsList);
        this.topicsList = topicsList;

        let grid = this.createChild("div", {class: "grid-space"});
        this.grid = grid.createChild(CommsGrid, {events: {
            "icon-select": (e) => {
                if (!this.editMode) {
                    let item = e.selectedItem;
                    if (Topics.isTopicItem(item.type)) {
                        topicsList.selectTopic(item.topicUID);
                        this.showTopic(item.topicUID);
                        e.stopImmediatePropagation()
                    }
                }
            }
        }});
   

        let editor = this.createChild("div", {class: "editor-panel"});
        this.editor = editor.createChild(EditPanel, {}, this);

        this.popup = this.createChild(PopupPromt, {});

        topicsList.events = {
            edit: () => this.editTopic(),
            trash: () => this.deleteTopic(),
            select: () => this.showTopic(topicsList.selected, false),
            add: () => this.createTopic(),
            copy: () => this.copyTopic()
        }

        this.editor.events = {
            cancel: () => {
                this.editMode = false;
                this.showTopic(topicsList.selected, true)
            },
            save: () => {
                this.editMode = false;
                Topics.updateTopic(this.editor.topic);
                this.showTopic(topicsList.selected, true)
            },
            add: async () => {
                this.editMode = false;
                let key = await Topics.addTopic(this.editor.topic);
                this.topicsList.selectTopic(key)
                this.showTopic(key, true);
            }
        }

        Topics.onTopicsUpdate(() => {
            this.showTopic(topicsList.selected, true);
        })
    }

    createTopic(){
        this.editMode = true;
        let topic = Topics.getEmptyTopic();
        this.editor.topic = topic;
        this.grid.setTopic(topic, true);
    }

    copyTopic(){
        let copy = Topics.getTopicCopy(this.selectedTopic);
        this.editor.topic = copy;
        this.grid.setTopic(copy, true);
        this.editMode = true;
    }

    editTopic(uid) {
        this.editMode = true;
    }


    async deleteTopic() {
        let uid = this.topicsList.selected;
        let name = Topics.getTopicInfo(uid).name;
        let confirm = await this.popup.promt(`Are you sure you want to <b>delete</b> <br> the topic <b>'<u>${name}</u>'</b>?`);
        if (confirm) {
            Topics.deleteTopic(uid);
        }
    }

    showTopic(uid, fast) {
        if (!this.editMode) {
            let topic = Topics.getTopic(uid);
            this.grid.setTopic(topic, fast);
            this.selectedTopic = uid;
            this.editor.topic = topic;
        }
    }


    set editMode(value){
        this._editMode = value;
        let time = 0.3;
        this.styles = {"--tran-time": time + "s"};
        this.toggleAttribute("edit", value);
        setTimeout(() => {this.styles = {"--tran-time": "0s"}}, time * 1000);
    }

    get editMode(){return this._editMode;}

    async initialise() {
        await Topics.initialise(async () => {
            let firstTopic = this.topicsList.topics[0].topicUID
            this.topicsList.selectTopic(firstTopic, false);
            this.showTopic(firstTopic, true);
            await this.grid.currentGrid.waitForLoad()
        });
    }
}


