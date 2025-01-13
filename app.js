import { GridEditor } from "./GridCreator/grid-editor.js";
import { SvgPlus } from "./SvgPlus/4.js";

class GridCreatorApp extends SvgPlus {
    constructor(el = "grid-creator-app"){
        super(el);
        this.gridEditor = this.createChild(GridEditor);
        this.load();
    }

    async load(){
        await this.gridEditor.initialise();
        window.loader.hide();
    }

}

SvgPlus.defineHTMLElement(GridCreatorApp)