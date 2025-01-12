import { initialise } from "./Firebase/firebase-client.js";
import { GridEditor } from "./GridCreator/grid-editor.js";
import { SvgPlus } from "./SvgPlus/4.js";

class GridCreatorApp extends SvgPlus {
    constructor(el = "grid-creator-app"){
        super(el);
        this.createChild(GridEditor);
        this.load();
    }

    async load(){
        await initialise();
        window.loader.hide();
    }

}

SvgPlus.defineHTMLElement(GridCreatorApp)