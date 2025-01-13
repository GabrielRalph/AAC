import { GridEditor } from "./GridCreator/grid-editor.js";
import { SvgPlus } from "./SvgPlus/4.js";

class GridCreatorApp extends SvgPlus {
    constructor(el = "grid-creator-app"){
        super(el);
        this.gridEditor = this.createChild(GridEditor);
        this.load();
    }

    async load(){
        try {
            await this.gridEditor.initialise();
        } catch (e) {
            let d1 = this.createChild("div", {class: "popup-promt", show:true});
            let d2 = d1.createChild("div", {content: "Sorry, you are not authenticated and can not <br> use this app currently!"})
        }
        document.querySelector("squidly-loader").hide(0.3);
    }

}

SvgPlus.defineHTMLElement(GridCreatorApp)