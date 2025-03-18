import { SvgPlus } from "../SvgPlus/4.js";
import { Icon } from "../Icons/icons.js";

/**
 * @typedef {Object} InputDescriptor
 * @property {string} name
 * @property {string} type
 * @property {string} defaultValue
 * @property {string} [key]
 * @property {Function} [parser]
 * @property {Function} [serialiser]
 * @property {Function} [generator]
 */
export function isExactSame(obj1, obj2) {
    if (typeof obj1 !== typeof obj2) return false;
    else if (typeof obj1 === "object") {
        if (obj1 === null && obj2 === null ) return true;
        else if (obj1 === null || obj2 === null) return false;
        else {
            let k1 = new Set(Object.keys(obj1));
            let k2 = new Set(Object.keys(obj2));
            let k3 = new Set();
            for (let v of k1) k3.add(v);
            for (let v of k2) k3.add(v);
        
            if (k1.size !== k3.size) {
                return false;
            } else {
                for (let key of k1) {
                    let v1 = obj1[key];
                    let v2 = obj2[key];
                    if (!isExactSame(v1, v2)) return false;
                }
            }
        }
    } else if ( obj1 !== obj2 ) return false;
  
    return true;
}
  
export class ResizeWatcher extends SvgPlus {
    constructor(el) {
        super(el);
        let updateSize = () => {
            let size = this.bbox[1]
            this.styles = {
                "--width": size.x + "px",
                "--height": size.y + "px",
            }
            if (this.onresize instanceof Function) this.onresize();
            this.dispatchEvent(new Event("resize"));
        }
        let rs = new ResizeObserver(updateSize)
        rs.observe(this);
        window.requestAnimationFrame(updateSize)
    }
}

export class ToggleInput extends SvgPlus {
    constructor(){
        super("toggle-input");
        this.input = this.createChild("input", {
            type: "checkbox",
            events: {
                change: () => this.dispatchEvent(new Event("change"))
            }
        });
        this.createChild("div", {class: "circle"})

    }

    get value(){
        return this.input.checked
    }
    set value(bool) {
        this.input.checked = bool;
    }
}

/**
 * @template {any} T
 * 
 * @typedef {HTMLElement} OrderedListItem
 * @property {number} index
 * @property {T} value
 */
export class OrderedList extends SvgPlus {
    dragTarget = null;

    /**
     * @param {(T) => string} serialiser
     * @param {() => T} generator
     */
    constructor(serialiser = (o) => o?.title, generator = () => {return {title: "new item"}}, options){
        super("ordered-list");
        if (typeof options !== "object" || options == null) options = {}
        if (!(serialiser instanceof Function)) throw "Serialiser must be a function";
        if (!(generator instanceof Function)) throw "Generator must be a function";
        this.serialiser = serialiser;
        this.generator = generator;
        this.maxItems = options.maxItems;
        this.minItems = options.minItems;
        this.addIcon = new Icon("add");
        this.addIcon.onclick = this.addItem.bind(this);
    }

    /**
     * @param {(OrderedListItem|number)} selected
     */
    set selected(selected){
        if (typeof selected === "number") {
            selected = this.children[selected];
        }
        
        this._selected = selected;
        for (let child of this.children) {
            child.toggleAttribute("selected", child === selected)
        }
    }
    
    /**
     * @return {OrderedListItem}
     */
    get selected(){
        return this._selected;
    }

    /** Creates new item in the ordered list.
     * @param {T} item;
     */
    createItem(item, i = this.children.length) {
        let icon = this.createChild("div", {
            content: this.serialiser(item),
            draggable: "true",
            events: {
                click: () => {
                    if (icon == this.selected) this.selected = null;
                    else this.selected = icon;
                    this.dispatchEvent(new Event("select"));
                },
                dragstart: () => {
                    this.dragTarget = icon;
                },
                dragend: (e) => {
                    this.dragTarget = null;
                },
                drop: (e) => {
                    if (this.dragTarget && icon) {
                        this.moveItems(this.dragTarget, icon);
                        this.dragTarget = null;
                        this.dispatchEvent(new Event("change"));
                    }
                },
                dragover: (e) => {
                    if (this.dragTarget) {
                        e.preventDefault();
                    }                        
                },
            }
        })
        Object.defineProperty(icon, "value", {
            get: () => item,
            set: (o) => {
                item = o;
                icon.innerHTML = this.serialiser(item);
            }
        })
        icon.index = i;
        icon.createChild(Icon, {
            events: {
                /** @param {Event} e */
                click: (e) => {
                    e.stopImmediatePropagation();
                    this.deleteItem(icon);
                    this.dispatchEvent(new Event("change"));
                }
            }
        }, "trash");
        this.toggleAttribute("no-delete", this.children.length === this.minItems);
        this.addIcon.toggleAttribute("no-add", this.children.length === this.maxItems);
    }

    /** Creates a new item using the defined generator */
    addItem() {
        if (this.children.length !== this.maxItems) {
            let newItem = this.generator(this.value);
            this.createItem(newItem);
            this.dispatchEvent(new Event("change"))
        }
        this.addIcon.toggleAttribute("no-add", this.children.length === this.maxItems);
    }

    /** Swaps the target element with the source element.
     * @param {OrderedListItem} target
     * @param {OrderedListItem} source
     */
    moveItems(target, source) {
        let beforeTarget = target.previousSibling;
        source.before(target);
        if (beforeTarget) beforeTarget.after(source);
        else this.prepend(source);
        
        [...this.children].forEach((e,i)=>e.index=i);
    }

    /** Deletes an item from the list.
     * @param {OrderedListItem} target
     */
    deleteItem(target) {
        if (this.children.length !== this.minItems) {
            if (this.selected == target) this.selected = null;
            target.remove();
            [...this.children].forEach((e,i)=>e.index=i);
        }
        this.toggleAttribute("no-delete", this.children.length === this.minItems);
        this.addIcon.toggleAttribute("no-add", this.children.length === this.maxItems);

    }

    /**
     * @param {T[]}
     */
    set value(values){
        if (!Array.isArray(values)) values = [];
        if (!isExactSame(this.value, values)) {
            this.innerHTML = "";
            values.forEach((...args) => this.createItem(...args))
        }
    }

    /**
     * @return {T[]}
     */
    get value(){
        return [...this.children].map(c => c.value);
    }
}

export class ImageSelect extends SvgPlus {
    constructor(){
        super("image-select");
        this.img = this.createChild("img", {events: {
            load: () => {
                if (this.onImgResponse instanceof Function) this.onImgResponse(true)
                this.setAttribute("img", "loaded")
            },
            error: () => {
                if (this.onImgResponse instanceof Function) this.onImgResponse(false)
                this.toggleAttribute("img", false)
            },
        }});
        this.createChild(Icon, {
            class: "icon paste",
            events: {
                click:  async (e) => {
                    e.stopImmediatePropagation();
                    try {
                        const text = await navigator.clipboard.readText();
                        let url = await this.checkURL(text);
                        this.value = url;
                        this.dispatchEvent(new Event("change"))
                    } catch (e) {
                    }
                }
            }
        }, "paste");
        this.createChild(Icon, {
            class: "icon delete",
            events: {
                click: (e) => {
                    e.stopImmediatePropagation();
                    this.value = null
                    this.dispatchEvent(new Event("change"))
                }
            }
        }, "trash");
        this.createChild(Icon, {
            class: "icon search",
            events: {
                click: this.searchQuery.bind(this)
            }
        }, "search");
    }

    async searchQuery(e){
        if (e instanceof Event) e.stopImmediatePropagation();
        const event = new Event("image-search-query", {bubbles: true});
        this.dispatchEvent(event);
        if (event.queryPromise instanceof Promise) {
            let url = await event.queryPromise;

            if (typeof url === "string" && url.length > 0) {
                this.value = url;
                this.dispatchEvent(new Event("change"))
            }
        }
    }


    async checkURL(url) {
        if (typeof url !== "string") url = null;
        if (url !== null) {
            this.img.props = {src: url};
            let valid = await new Promise((r) => this.onImgResponse = r);
            if (!valid) url = null;
        }
        return url;
    }


    set value(url) {
        this._value = url;
        this.toggleAttribute("img", false);
        if (url != null) this.img.props = {src: url};
    }
    get value(){
        return this._value;
    }
}

export class Selection extends SvgPlus {
    constructor(values, options) {
        super("selection-radio")
        for (let value of values) {
            let el;
            if (options.makeItemElement instanceof Function) {
                el = options.makeItemElement(value);
                el.value = value;
                this.appendChild(el);
            } else {
                el = this.createChild("div", {content: value})
            }

            el.onclick = () => {
                this.value = value;
                this.dispatchEvent(new Event("change"))
            }
        }
    }

    get value(){
        return this._selected;
    }

    set value(value) {
        [...this.children].forEach(child => child.toggleAttribute("selected", child.value == value));
        this._selected = value;

    }
}

export class OptionSearch extends SvgPlus {
    constructor(data) {
        super("option-search");
        let {options} = data;
        this.createChild("input");
    }
}

export class WBlock extends SvgPlus {
    constructor(){
        super("w-block")
        this.head = this.createChild("div", {class: "head"});
        this.main = this.createChild("div", {class: "main"});
    }
}

export class WBInput extends WBlock {
    /** @type {HTMLElement} */
    input = null;

    /** 
     * @param {InputDescriptor} type
     */
    constructor(data) {
        super();
        let {name, defaultValue, type} = data;
        this.props = {name, type}

        switch (type) {
            case "text": 
                this.head.createChild("div", {content: name});
                this.input = this.main.createChild("input", {
                    value: defaultValue,
                });
                break;

            case "number": 
                this.head.createChild("div", {content: name});
                this.input = this.main.createChild("input", {
                    type: "number",
                    value: defaultValue,
                });
                break;

            case "multiline": 
                this.head.createChild("div", {content: name});
                this.input = this.main.createChild("textarea", {
                    rows: data.rows,
                    value: defaultValue,
                });
                break;

            case "selection": 
                this.head.createChild("div", {content: name});
                this.input = this.main.createChild("select");
                for (let option of data.options) {
                    let value = option;
                    let content = option;
                    if (Array.isArray(option)) [content, value] = option;
                    this.input.createChild("option", {content: content, value: value})
                }
                this.input.value = defaultValue;
                break;

            case "orderedList": 
                /** @type {OrderedList} */
                this.input = this.main.createChild(OrderedList, {}, data.serialiser, data.generator, data);
                this.input.value = defaultValue;

                let r = this.head.createChild("div", {class: "row"});
                r.createChild("div", {content: name});
                r.appendChild(this.input.addIcon);
                break;

            case "selection-radio": 
                this.head.createChild("div", {content: name});
                this.input = this.main.createChild(Selection, {}, data.options, data);
                this.input.value = defaultValue;
                break;

            case "imageSelect": 
                this.head.createChild("div", {content: name});
                this.input = this.main.createChild(ImageSelect, {});
                this.input.value = defaultValue;
                break;

            case "toggle":
                let row = this.head.createChild("div", {class: "row"});
                row.createChild("span", {content: name});
                this.input = row.createChild(ToggleInput);
                this.input.value = defaultValue;
                break;
        }
        this.parser = data.parser instanceof Function ? data.parser : (a) => a;

        this.input.events = {
            change: (e) => {
                if (!e.bubbles)
                    this.dispatchEvent(new Event("change"));
            },
            select: (e) => {
                if (!e.bubbles) 
                    this.dispatchEvent(new Event("select"))
            }
        }
    }

    get value(){
        return this.parser(this.input.value);
    }

    set value(value) {
        this.input.value = value;
    }
}

export class WBInputs extends SvgPlus {
    /**
     * @param {InputDescriptor[]}
     */
    constructor(inputs) {
        super("wb-inputs")
        this.inputs = {}
        for (let input of inputs) {
            let key = input.key || input.name.toLowerCase();
            let wbinput = this.createChild(WBInput, {
                events: {
                    change: (e) => {
                        if (e.bubbles) {
                            e.input = key;
                        } else {
                            const event = new Event("change");
                            event.input = key;
                            this.dispatchEvent(event);
                        }
                    },
                    select: (e) => {
                        if (e.bubbles) {
                            e.input = key;
                        } else {
                            const event = new Event("select");
                            event.input = key;
                            this.dispatchEvent(event);
                        }
                    }
                }
            }, input);
            
            this.inputs[key] = wbinput;
           
        }
    }

    set value(value) {
        for (let key in value) {
            if (key in this.inputs) {
                if (!isExactSame(value[key], this.inputs[key])) {
                    this.inputs[key].value = value[key]
                }
            }
        }
    }

    get value(){
        let value = {};
        for (let key in this.inputs) {
            value[key] = this.inputs[key].value;
        }
        return value;
    }
}

export class PopupPromt extends SvgPlus {
    constructor(){
        super("div");
        this.class = "popup-promt";

        let pwindow = this.createChild("div");
        this.messageEl = pwindow.createChild("div");
        let buttons = pwindow.createChild("div");
        this.confirm = buttons.createChild("button", {content: "confirm"});
        this.cancel = buttons.createChild("button", {content: "cancel"});
    }

    async promt(message) {
        this.message = message;
        this.toggleAttribute("show", true);
        let result = await new Promise((resolve, reject) => {
            this.confirm.onclick = () => resolve(true);
            this.cancel.onclick = () => resolve(false);
        })
        this.toggleAttribute("show", false)
        return result;
    }

    set message(text){
        this.messageEl.innerHTML = text
    }
}

export class PromiseChain {
    constructor(){
        this.head = null;
        this.tail = null;

    }
    /** @param {() => Promise} */
    async addPromise(func) {
        let item = {next: null, prom: null};

        // Add item to chain
        if (this.head == null) {
            this.head = item;
            this.tail = item;
        } else {
            this.tail.next = item;
            this.tail = item;
        }

        // wait for previous promises in the chain
        let node = this.head;
        while (node != item) {
            await node.prom;
            node = node.next;
        }

        // call the promise added.
        item.prom = func();
        let res = await item.prom;

        // remove the item from the chain
        if (this.tail == item) {
            this.tail = null;
            this.head = null;
        } else {
            this.head = item.next;
        }
        return res;
    }
}


export function attachScrollWatcher(element) {
    let o = new ResizeObserver(() => {
        console.log(element.scrollHeight);
        
    })
    o.observe(element);
}