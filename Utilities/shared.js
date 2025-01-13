import { SvgPlus } from "../SvgPlus/4.js";

export class ToggleInput extends SvgPlus {
    constructor(){
        super("toggle-input");
        this.input = this.createChild("input", {type: "checkbox"});
        this.createChild("div", {class: "circle"})

    }

    get value(){
        return this.input.checked
    }
    set value(bool) {
        this.input.checked = bool;
    }
}
export class WBlock extends SvgPlus {
    constructor(){
        super("w-block")
        this.head = this.createChild("div", {class: "head"});
        this.main = this.createChild("div", {class: "main"});
    }
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