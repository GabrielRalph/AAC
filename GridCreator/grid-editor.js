import {SvgPlus} from "../SvgPlus/4.js"
import * as Topics from "../Firebase/topics.js"
import { CommsGrid, GridIconSymbol } from "./grid.js";
import { SearchWidget } from "./symbol-search.js";
import { WBlock, ToggleInput, ResizeWatcher} from "../Utilities/shared.js";
import { Icon } from "../Icons/icons.js";

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

        this.grid.events ={
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

    create_text_input(name, defaultValue) {
        let textWB = this.createChild(WBlock, {name: name});
        textWB.head.createChild("div", {content: name});
        let textValue = textWB.main.createChild("input", {
            value: defaultValue,
        });
        textValue.container = textWB;
        return textValue;
    }

    create_selection_input(name, options, defaultValue) {
        let sizeWB = this.createChild(WBlock, {name: name});
        sizeWB.head.createChild("div", {content: name});
        let sizes = sizeWB.main.createChild("select");
        for (let option of options) {
            let value = option;
            let content = option;
            if (Array.isArray(option)) [content, value] = option;
            sizes.createChild("option", {content: content, value: value})
        }
        sizes.value = defaultValue;
        sizes.container = sizeWB;
        return sizes;
    }

    create_icon_symbol_input(defaultValue) {
        let iconWB = this.createChild(WBlock, {name: "symbol"});
        iconWB.head.createChild("div", {content: "Icon Symbol"});
        iconWB.main.createChild(GridIconSymbol, {}, defaultValue)
        iconWB.value = defaultValue;
        iconWB.events = {
            click: async () => {
                let value = await this.gridEditor.selectSymbol();
                
                if (value) {
                    iconWB.value = value;
                    iconWB.main.innerHTML = "";
                    iconWB.main.createChild(GridIconSymbol, {}, value)
                }

            }
        }
        return iconWB;
    }

    create_toggle_input(name, defaultValue){
        let iconWB = this.createChild(WBlock, {name: name});
        let row = iconWB.head.createChild("div", {class: "row"});
        row.createChild("span", {content: name});
        let input = row.createChild(ToggleInput);
        input.container = iconWB;
        input.value = defaultValue;
        return input;
    }

    validateItem(inputs) {
        let valid = true;
        if (!inputs.hidden.value) {
            if (!inputs.displayValue.value) { 
                valid = false;
                inputs.displayValue.container.toggleAttribute('error', true);
            }

            if (!inputs.type.value) { 
                valid = false;
                inputs.type.container.toggleAttribute('error', true);
            }

            if (inputs.type.value == "topic") {
                if (!inputs.topicUID.value) {
                    inputs.topicUID.container.toggleAttribute('error', true);
                    valid = false;
                }
            }
        }
        return valid;
    }

    validateTopic(inputs) {
        let valid = true;
        if (!inputs.name.value) {
            inputs.name.container.toggleAttribute('error', true);
            valid = false;
        }

        if (!inputs.size.value) {
            inputs.size.container.toggleAttribute('error', true);
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

    selectItem(item, idx) {
        this.innerHTML = "";

        let topicUIDS = Topics.getTopics().map(t => [t.name, t.topicUID]);
        let inputs = {
            hidden: this.create_toggle_input("Hidden", item.hidden),
            displayValue:  this.create_text_input("Display Value", item.displayValue),
            utterance: this.create_text_input("Utterance", item.utterance),
            symbol: this.create_icon_symbol_input(item.symbol),
            type: this.create_selection_input("Type", Topics.getGItemTypes(), item.type),
            topicUID: this.create_selection_input("Topic", topicUIDS, item.topicUID),
        }
        for (let k in inputs) {
            let input = inputs[k]
            input.events = {focus: () => input.container.toggleAttribute("error", false)}
        }

        let {type, hidden} = inputs;
        type.events = {change: () => this.setAttribute("type", type.value)}
        this.setAttribute("type", type.value)

        hidden.events = {change: () => this.toggleAttribute("i-hidden", hidden.value)}
        this.toggleAttribute("i-hidden", hidden.value)

        let row = this.createChild("div", {class: "row bigger"})
        row.createChild("button", {events: {
            click: () => {
                if (this.validateItem(inputs)) {
                    for (let key in inputs) {
                        item[key] = inputs[key].value;
                    }
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
            let name = this.create_text_input("Topic Name", topic.name);
            name.events = {
                change: () => {
                    topic.name = name.value;
                }
            }
    
            let size = this.create_selection_input("Grid Size",Topics.getGridSizes(), topic.size)
            size.events = {
                change: () => {
                    topic.size = size.value;
                    this.grid.topic = topic;
                }
            }

            let starter = this.create_toggle_input("Start Topic", topic.starter);
            starter.events = {
                change: () => {
                    topic.starter = starter.value
                }
            }

            let isPublic = this.create_toggle_input("Public", topic.public);
            isPublic.events = {
                change: () => {
                    topic.public = isPublic.value
                }
            }

            let inputs = {name, size, starter}
            for (let k in inputs) {
                let input = inputs[k]
                input.events = {focus: () => input.container.toggleAttribute("error", false)}
            }

            let isAdd = topic.topicUID == "new"
            let row = this.createChild("div", {class: "row bigger"})
            row.createChild("button", {events: {
                click: () => {
                    if (this.validateTopic(inputs)) {
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
        this.createChild("img", {src: "./Assets/logo-banner.svg"})
        let wblock = this.createChild(WBlock);
        let r = wblock.head.createChild("div", {class: "row topics-head bigger"});
        r.createChild("span", {content: "Topics"})
        r.createChild("button", {events: {
            click: () => this.dispatchEvent(new Event("add"))
        }}).createChild(Icon, {}, "add")
        wblock.main.onclick = () => this.selectTopic(null, true);
        this.wblock = wblock;

        let buttons = this.createChild("div", {class: "topics-buttons row bigger"});
        buttons.createChild("button", {events: {
            click: () => this.dispatchEvent(new Event("edit"))
        }}).createChild(Icon, {}, "edit")

        buttons.createChild("button", {events: {
            click: () => this.dispatchEvent(new Event("delete")),
            contextmenu: (e) => {
                Topics.logData();
                e.preventDefault();
            }
        }}).createChild(Icon, {}, "trash")

        let init = true;
        Topics.onTopicsUpdate(() => {
            let topics = Topics.getTopics();
            
            this.topics = topics;
            if (init) {
                init = false;
                if (topics.length > 0) {
                    this.selectTopic(topics[0].topicUID, true);
                }
            }
        })
    }



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

    set topics(topics){
        let {main} = this.wblock
        console.log(topics);
        
        let si = topics.map((t, i) => [(t.starter ? "a" : "b") + (t.owned ? "a" : "b") + (t.public ? "a" : "b") + t.topicUID, i]);
        si.sort((a, b) => b[0] > a[0] ? -1 : 1);
        topics = si.map(([s, i]) => topics[i]);

        main.innerHTML = "";
        let topicIcons = {}
        for (let topic of topics) {
            let ticon = main.createChild("div", {
                class: "topic-name-title",
                content: topic.name,
                events: {
                    /** @param {MouseEvent} e */
                    click: (e) => {
                        e.stopPropagation();
                        this.selectTopic(topic.topicUID, true)
                    }
                }
            })
            let indicators = ticon.createChild("div", {class: "indicators"})
            for (let key of ["starter", "owned", "public"]) {
                ticon.toggleAttribute(key, topic[key]);
                ticon[key] = topic[key];
                indicators.createChild("div", {class: "indicator", type: key})
            }

            if (this.selected == topic.topicUID) ticon.toggleAttribute("selected", true);

            topicIcons[topic.topicUID] = ticon;
        }
        this.topicIcons = topicIcons;
    }
}

export class GridEditor extends ResizeWatcher {
    /** @type {CommsGrid} */
    grid = null;

    constructor(){
        super("grid-editor");
        let searchWindow = this.createChild("div", {class: "search-window"})
        this.symbolSeach = searchWindow.createChild(SearchWidget);
        this.searchWindow = searchWindow;

        let topicsList = this.createChild(TopicsList);
        this.topicsList = topicsList;


        let grid = this.createChild("div", {class: "grid-space"});
        this.grid = grid.createChild(CommsGrid);


        let editor = this.createChild("div", {class: "editor-panel"});
        this.editor = editor.createChild(EditPanel, {}, this);


        topicsList.events = {
            edit: () => this.editTopic(),
            delete: () => this.deleteTopic(),
            select: () => this.showTopic(topicsList.selected, false),
            add: () => this.createTopic()
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
            add: () => {
                this.editMode = false;
                Topics.addTopic(this.editor.topic);
                this.showTopic(null, true);
            }
        }

        Topics.onTopicsUpdate(() => {
            this.showTopic(topicsList.selected, true);
        })
    
        Topics.initialise();
    }

    createTopic(){
        this.editMode = true;
        let topic = Topics.getEmptyTopic();
        this.editor.topic = topic;
        this.grid.setTopic(topic, true);
    }

    editTopic(uid) {
        this.editMode = true;
    }

    deleteTopic(uid) {

    }

    showTopic(uid, fast) {
        let topic = Topics.getTopic(uid);
        this.grid.setTopic(topic, fast);
        this.selectedTopic = uid;
        this.editor.topic = topic;
    }


    set editMode(value){
        let time = 0.3;
        this.styles = {"--tran-time": time + "s"};
        this.toggleAttribute("edit", value);
        setTimeout(() => {this.styles = {"--tran-time": "0s"}}, time * 1000);
    }


    async selectSymbol(){
        this.toggleAttribute("searching", true);
        let result = await new Promise((resolve, reject) => {
            this.symbolSeach.onclose = resolve;
        })
        this.toggleAttribute("searching", false);
        return result;
    }
}


