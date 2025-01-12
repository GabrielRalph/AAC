// T1 * 3t(1 - t)^2 + T2 * 3t^2(1-t) = P(t)  - (P1 * t^3 + P0 * (1 - t)^3)

// aT1 + bT2 + c
// [T1, T2, 1] * [a, b, c] = P + err
// Ax = y
// (P - T * A)^2 = err^2 
// (P - TA)(P - TA)
// P^2 + (TA)^2 - TAP - PTA
// 2TA - AP - PA = 0 
// 2TA = AP + PA
// T = 0.5 * (AP + PA) A^-1
function get_lengths(points) {
    let lengths = [0]
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
        sum += points[i-1].dist(points[i])
        lengths.push(sum)
    }

    return lengths.map(l => l/sum);
}
export function fitCubic(points) {
    let P0 = points[0];
    let P1 = points[points.length-1];
    let Ts = get_lengths(points);

    let yp = Ts.map((t, i) => points[i].sub(P1.mul(t**3).add(P0.mul((1-t)**3))));

    let A = new Matrix(Ts.map((t) => [3 * t * ((1-t)**2), 3 * (1-t) * (t **2)]));

    let y_x = new Matrix(yp.map(p => [p.x]));
    let y_y = new Matrix(yp.map(p => [p.y]));

    let T_x = lsr(A, y_x);
    let T_y = lsr(A, y_y);
    
    let res = [];
    for (let i =0; i < 2; i++) res.push([T_x.get(i, 0), T_y.get(i, 0)])
    return [[P0.x, P0.y], ...res, [P1.x, P1.y]]
}

/** 
 * @param {Matrix} A
 * @param {Matrix} y
 */
function lsr(A, y) {
    let AT = A.T();
    let ATA = AT.mul(A);
    let ATAi = ATA.inverse();
    return ATAi.mul(AT).mul(y);
}

class Matrix {
    constructor(data, check = false) {
        if (check) {
            if (!Array.isArray(data)) throw "matrix not array";
            let sizes = data.map(row => row.length);
            if ((new Set(sizes)).values.length != 1) throw "matrix has rows of different sizes";
        }
        this.data = data;
    }

    get shape(){
        return [this.data.length, this.data[0].length]
    }

    mul(b) {
        let [n, m] = this.shape;
        let [v, u] = b.shape;
        if (v != m) {
            throw 'dimension mis match'
        }

        let M = Matrix.zeros(n, u); 
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < u; j++) {
                let sum = 0;
                for (let k = 0; k < v; k++) {
                    sum += this.get(i, k) * b.get(k, j);
                }
                
                M[i][j] = sum;
            }
        }
        

        return new Matrix(M);
    }

    T() {
        let [n, m] = this.shape;
        let nM = Matrix.zeros(m, n);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                nM[j][i] = this.get(i, j);
            }
        }
        return new Matrix(nM);
    }

    inverse(){
        let M = this.data;
        // I use Guassian Elimination to calculate the inverse:
        // (1) 'augment' the matrix (left) by the identity (on the right)
        // (2) Turn the matrix on the left into the identity by elemetry row ops
        // (3) The matrix on the right is the inverse (was the identity matrix)
        // There are 3 elemtary row ops: (I combine b and c in my code)
        // (a) Swap 2 rows
        // (b) Multiply a row by a scalar
        // (c) Add 2 rows
        
        //if the matrix isn't square: exit (error)
        if(M.length !== M[0].length){return;}
        
        //create the identity matrix (I), and a copy (C) of the original
        var i=0, ii=0, j=0, dim=M.length, e=0, t=0;
        var I = [], C = [];
        for(i=0; i<dim; i+=1){
            // Create the row
            I[I.length]=[];
            C[C.length]=[];
            for(j=0; j<dim; j+=1){
                
                //if we're on the diagonal, put a 1 (for identity)
                if(i==j){ I[i][j] = 1; }
                else{ I[i][j] = 0; }
                
                // Also, make the copy of the original
                C[i][j] = M[i][j];
            }
        }
        
        // Perform elementary row operations
        for(i=0; i<dim; i+=1){
            // get the element e on the diagonal
            e = C[i][i];
            
            // if we have a 0 on the diagonal (we'll need to swap with a lower row)
            if(e==0){
                //look through every row below the i'th row
                for(ii=i+1; ii<dim; ii+=1){
                    //if the ii'th row has a non-0 in the i'th col
                    if(C[ii][i] != 0){
                        //it would make the diagonal have a non-0 so swap it
                        for(j=0; j<dim; j++){
                            e = C[i][j];       //temp store i'th row
                            C[i][j] = C[ii][j];//replace i'th row by ii'th
                            C[ii][j] = e;      //repace ii'th by temp
                            e = I[i][j];       //temp store i'th row
                            I[i][j] = I[ii][j];//replace i'th row by ii'th
                            I[ii][j] = e;      //repace ii'th by temp
                        }
                        //don't bother checking other rows since we've swapped
                        break;
                    }
                }
                //get the new diagonal
                e = C[i][i];
                //if it's still 0, not invertable (error)
                if(e==0){return}
            }
            
            // Scale this row down by e (so we have a 1 on the diagonal)
            for(j=0; j<dim; j++){
                C[i][j] = C[i][j]/e; //apply to original matrix
                I[i][j] = I[i][j]/e; //apply to identity
            }
            
            // Subtract this row (scaled appropriately for each row) from ALL of
            // the other rows so that there will be 0's in this column in the
            // rows above and below this one
            for(ii=0; ii<dim; ii++){
                // Only apply to other rows (we want a 1 on the diagonal)
                if(ii==i){continue;}
                
                // We want to change this element to 0
                e = C[ii][i];
                
                // Subtract (the row above(or below) scaled by e) from (the
                // current row) but start at the i'th column and assume all the
                // stuff left of diagonal is 0 (which it should be if we made this
                // algorithm correctly)
                for(j=0; j<dim; j++){
                    C[ii][j] -= e*C[i][j]; //apply to original matrix
                    I[ii][j] -= e*I[i][j]; //apply to identity
                }
            }
        }
        
        //we've done all operations, C should be the identity
        //matrix I should be the inverse:
        return new Matrix(I);
    }

    get(i, j) {
        return this.data[i][j];
    }

    static zeros(n, m) {
        return  (new Array(n)).fill(0).map(() => new Array(m).fill(0))
    }
}

// let a = new Matrix([[1, 1],[2, 2]]);
// let b =  new Matrix([[3, 4],[-1, -1]]);
// console.log(a.mul(b));
