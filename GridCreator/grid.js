import { SvgPlus, Vector } from "../SvgPlus/4.js";
import { ResizeWatcher } from "../Utilities/shared.js";
import * as Topics from "../Firebase/topics.js";

function range(end) {
    return new Array(end).fill(0).map((...a)=>a[1])
}


let USE_DRAG_IMAGE = true;

export class GridIconSymbol extends SvgPlus{
    constructor(symbol){
        super("div");
        this.class = "symbol";
        this.createChild("img", {src: symbol.url})
    }
}


const MAKE_CARD_ICON = {
    topic(size, border = 4) {
        let inSize = size.sub(border);
        let g = inSize.y / 20;
        let w = inSize.x;
        let b = w * 0.45;
    
        g = Math.min(b / 3, g);
    
    
        let t = g / 3;
        let h = inSize.y;
    
    
        let p0 = new Vector(border/2, border/2 + 2*g);
        let p1 = p0.addV(-g);
        let p2 = p1.add(g, -g);
    
        let c2 = p1.addH(b);
        let c1 = c2.add(-g);
        
        let tv = new Vector(t, 0);
        let tv2 = tv.rotate(-Math.PI * 3 / 4);
    
        let p3 = c1.sub(tv);
        let p4 = c1.sub(tv2);
    
        let p5 = c2.add(tv2);
        let p6 = c2.add(tv);
    
        let p7 = p1.addH(w - g);
        let p8 = p0.addH(w);
    
        let rg = new Vector(g);
        let rt = new Vector(t * Math.tan(Math.PI * 3 / 8));
    
        let tabPath = `M${p0}L${p1}A${rg},0,0,1,${p2}L${p3}A${rt},0,0,1,${p4}L${p5}A${rt},0,0,0,${p6}L${p7}A${rg},0,0,1,${p8}Z`
    
        let p9 = p8.addV(h - 3 * g);
        let p10 = p9.add(-g, g);
    
        let p11 = p10.addH(2 * g - w);
        let p12 = p11.sub(g);
    
        let card = `M${p8.addV(-0.1)}L${p9}A${rg},0,0,1,${p10}L${p11}A${rg},0,0,1,${p12}L${p0.addV(-0.1)}Z`
        let outline = `M${p0}L${p1}A${rg},0,0,1,${p2}L${p3}A${rt},0,0,1,${p4}L${p5}A${rt},0,0,0,${p6}L${p7}A${rg},0,0,1,${p8}L${p9}A${rg},0,0,1,${p10}L${p11}A${rg},0,0,1,${p12}Z`;
        return  `<path class = "card" d = "${card}" />
                 <path class = "tab" d = "${tabPath}" />
                 <path stroke-width = "${border}" class = "outline" d = "${outline}" />`
    },
    normal(size, border = 4) {
        let inSize = size.sub(border);
        let g = inSize.y / 20;

        return `<rect class = "card" x = "${border/2}" y = "${border/2}" width = "${inSize.x}"  height = "${inSize.y}" rx = "${g}" ry = "${g}" />
                <rect stroke-width = "${border}" class = "outline" x = "${border/2}" y = "${border/2}" width = "${inSize.x}"  height = "${inSize.y}" rx = "${g}" ry = "${g}" />`
    },
    starter(size, border = 4) {
        let inSize = size.sub(border);
        let g = inSize.y / 20;

        return `<rect class = "card" x = "${border/2}" y = "${border/2}" width = "${inSize.x}"  height = "${inSize.y}" rx = "${g}" ry = "${g}" />
                <rect stroke-width = "${border}" class = "outline" x = "${border/2}" y = "${border/2}" width = "${inSize.x}"  height = "${inSize.y}" rx = "${g}" ry = "${g}" />`
    },
}

class GridIcon extends SvgPlus {
    constructor(item, groupNumber){
        super("grid-icon", "grid-row-"+groupNumber);
        this.class = item.type;
        this.type = item.type;
        this.toggleAttribute("i-hidden", item.hidden);
        this.setAttribute("draggable", true)

        this.cardIcon = this.createChild("svg", {class: "card-icon"});
        this.content = this.createChild("div", {class: "content"});

        this.symbol = this.content.createChild(GridIconSymbol, {}, item.symbol);
        this.content.createChild("div", {content: item.displayValue, class: "display-value"});

        let rs = new ResizeObserver(() => this.onresize())
        rs.observe(this);
    }

    onresize(){
        if (this.parentElement) {
            let size = this.bbox[1];
            
            if (size.x > 1e-10 && size.y > 1e-10) {
                this.cardIcon.props = {
                    viewBox: `0 0 ${size.x} ${size.y}`,
                    content: MAKE_CARD_ICON[this.type](size)
                }
            }
        }
    }
}

class Rotater extends SvgPlus {
    angle = 0;
    constructor(){
        super("div");
        this.class = "rotater";
        let rel = this.createChild("div")
        this.slot1 = rel.createChild("div", {class: "slot-1"});
        this.slot2 = rel.createChild("div", {class: "slot-2"});
        this.transitionTime = 0.8;
    }


    setContent(content, immediate = false) {
        let element = immediate ? this.shownSlot : this.hiddenSlot;

        element.innerHTML = "";
        if (content instanceof Element) {
            element.appendChild(content);
        }

        if (!immediate) {
            this.flipped = !this.flipped;
        }
    }

    
    set transitionTime(time){
        this._transitionTime = time;
        this.styles = {"--transition-time": time + "s"}
    }
    get transitionTime(){ return this._transitionTime; }
    
    get shownSlot(){ return this.flipped ? this.slot1 : this.slot2; }
    get hiddenSlot(){ return this.flipped ? this.slot2 : this.slot1; }


    set flipped(bool) {
        this.angle =  this.angle + 180;

        // this.toggleAttribute("flip", bool);
        this.styles = {
            "--angle": this.angle + "deg"
        }
        this.toggleAttribute("flip", bool);
        this._flipped = bool;

        setTimeout(() => {
            this.hiddenSlot.innerHTML = "";
        }, this.transitionTime * 1000);

    }
    get flipped(){return this._flipped;}
}

class GridSpace extends SvgPlus {
    constructor(row, col){
        super("grid-space");
        this.row = row;
        this.styles = {
            "grid-area": `${row+1} / ${col+1}`
        }
    }

    set hover(bool){
        if (this.icon) this.icon.toggleAttribute("hover", bool);
    }

    set value(item) {
        let icon = new GridIcon(item, this.row);
        this.innerHTML = "";
        this.appendChild(icon);
        this.icon = icon;
    }
}

class Grid extends SvgPlus {
    constructor() {
        super("grid-block");
        
    }

    selectIcon(pos, idx){
        if (this.lastSelected) {
            let [r, c] = this.lastSelected;
            this.cells[r][c].hover = false;
        }

        if (pos) {
            let [r, c] = pos;
            let cell = this.cells[r][c];
            cell.hover = true;
            if (typeof idx === "number") {
                let event = new Event("icon-select", {bubbles: true})
                event.selectedIconIndex = idx;
                cell.dispatchEvent(event);
            }
        }
        this.lastSelected = pos;
    }   

    dragEnd(source, target){
        console.log(source, target);
        
        let event = new Event("icon-drag", {bubbles: true})
        event.targetIndex = target;
        event.sourceIndex = source;
        this.dispatchEvent(event);
    }

    set topic(topic) {
        let [cols, rows] = Topics.getGridSize(topic.size)
        this.size = [cols, rows];
        let i = 0; 
        let dragIdx = null;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let item = topic.items[i];
                if (item) {
                    let idx = i;
                    let position = [r, c];
                    this.cells[r][c].value = item;
                    let {icon} = this.cells[r][c];
                    let ghostEl = null;
                    icon.events = {
                        click: () => {
                            this.selectIcon(position, idx)
                        },
                        dragstart: (e) => {
                            this.selectIcon(position, idx);
                            if (USE_DRAG_IMAGE){
                                let [pos, size] = icon.bbox;
                                let offset = pos.sub(e.clientX, e.clientY)
                                ghostEl = new SvgPlus("div");
                                ghostEl.styles = {
                                    position: "fixed",
                                    top: pos.y+ "px",
                                    left: pos.x + "px",
                                    display: "flex",
                                    width: size.x + "px",
                                    height: size.y + "px",
                                    "pointer-events": "none",
                                    "z-index": 1000000,
                                }
                                ghostEl.appendChild(icon.cloneNode(true))
                                document.body.appendChild(ghostEl);
                                e.dataTransfer.setDragImage(ghostEl, -offset.x, -offset.y)
                            } 
                            dragIdx = idx;
                        },
                        dragover: (e) => {
                            e.preventDefault();
                        },
                        drop: (e) => {
                            this.dragEnd(dragIdx, idx)
                        },
                        dragend: () => {
                            dragIdx = null;
                            if (ghostEl) ghostEl.remove();
                        }
                    }
                }
                i++;
            }
        }

        this.selectIcon(this.lastSelected)
    }

    set size([cols, rows]){
        // add row and column templates
        this.styles = {
            "grid-template-columns": new Array(cols).fill("1fr").join(" "),
            "grid-template-rows": new Array(rows).fill("1fr").join(" "),
            "--rows": rows,
            "--cols": cols,
        }
        this.innerHTML = "";
        // Create remainding grid cell spaces
        this.cells = [
            ...range(rows).map(i => 
                range(cols).map((j) => 
                    this.createChild(GridSpace, {}, i, j)
                )
            )
        ];
    }
}

export class CommsGrid extends ResizeWatcher {
    constructor(){
        super("coms-grid")
        this.rotater = this.createChild(Rotater);
    }

    setTopic(topic, immediate) {
        let grid = null;
        if (topic) {
            grid = new Grid();
            grid.topic = topic;
        }
        this.rotater.setContent(grid, immediate);
        this.currentGrid = grid;
    }

    set topic(topic) {
        this.setTopic(topic, true);
    }

    unselectIcon(){
        this.currentGrid.selectIcon(null);
    }

}

