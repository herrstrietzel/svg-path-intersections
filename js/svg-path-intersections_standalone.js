
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        // CommonJS (Node.js) environment
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD environment
        define([], factory);
    } else {
        // Browser environment
        root.pathIntersections = factory();
    }
})(this, function () {
    var pathIntersections = {};



/**
 * Find all intersections between two SVG paths.
 * Based on snap.svg intersection function
 * Inspired by https://github.com/bpmn-io/path-intersection
 * lower sample distance = higher accuracy
 */

//  intersection from stringified path data
function findPathIntersections(d1, d2, stopAtFirst = false, sampleDist = 10) {

    // parse and normalize
    let options = {
        toAbsolute: true,
        arcsToCubic: true,
        arcAccuracy: 1
    }

    // parse path data
    let pathData1 = Array.isArray(d1) ? d1 : parsePathDataNormalized(d1, options)
    let pathData2 = Array.isArray(d1) ? d2 : parsePathDataNormalized(d2, options)

    return findPathDataIntersections(pathData1, pathData2, stopAtFirst, sampleDist)
}

/** 
 * check if paths are intersecting 
 * stop at first intersection to optimize performance
 * handy for collision tests
 * */
function checkPathIntersection(d1, d2) {
    // parse and normalize
    let options = {
        toAbsolute: true,
        arcsToCubic: true,
        arcAccuracy: 1
    }

    // parse path data
    let pathData1 = Array.isArray(d1) ? d1 : parsePathDataNormalized(d1, options)
    let pathData2 = Array.isArray(d1) ? d2 : parsePathDataNormalized(d2, options)

    return findPathDataIntersections(pathData1, pathData2, true, 20).length
}

//  intersection from parsed path data
function findPathDataIntersections(pathData1, pathData2, stopAtFirst = false, sampleDist = 10) {

    /**
     * helpers
     */
    const findCommandIntersections = (data1, data2, xy, stopAtFirst = false) => {

        let intersections = [];
        let quit = false;
        for (i = 0; i < data1.splits && !quit; i++) {

            for (let j = 0; j < data2.splits && !quit; j++) {
                let l1 = data1.dots[i],
                    l1_1 = data1.dots[i + 1],

                    l2 = data2.dots[j],
                    l2_1 = data2.dots[j + 1],
                    ci = Math.abs(l1_1.x - l1.x) < .01 ? 'y' : 'x',
                    cj = Math.abs(l2_1.x - l2.x) < .01 ? 'y' : 'x';


                let intersection = intersectLines(l1.x, l1.y, l1_1.x, l1_1.y, l2.x, l2.y, l2_1.x, l2_1.y)
                if (intersection) {

                    if (stopAtFirst && intersections) {
                        quit = true
                    }

                    let intersection_key = intersection.x.toFixed(1) + '_' + intersection.y.toFixed(1);

                    //if coorl1nates already found: skip
                    if (xy[intersection_key]) {
                        continue;
                    }
                    // save found intersection
                    xy[intersection_key] = true;

                    let t1 = l1.t + Math.abs((intersection[ci] - l1[ci]) / (l1_1[ci] - l1[ci])) * (l1_1.t - l1.t),
                        t2 = l2.t + Math.abs((intersection[cj] - l2[cj]) / (l2_1[cj] - l2[cj])) * (l2_1.t - l2.t);

                    if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {

                        intersections.push({
                            x: intersection.x,
                            y: intersection.y,
                            t1: t1,
                            t2: t2
                        });
                    }
                }
            }
        }

        return intersections;
    }


    const intersectLines = (x1, y1, x2, y2, x3, y3, x4, y4) => {

        const isOnLine = (x1, y1, x2, y2, px, py, tolerance = 0.001) => {
            var f = function (somex) { return (y2 - y1) / (x2 - x1) * (somex - x1) + y1; };
            return Math.abs(f(px) - py) < tolerance
                && px >= x1 && px <= x2;
        }

        if (
            Math.max(x1, x2) < Math.min(x3, x4) ||
            Math.min(x1, x2) > Math.max(x3, x4) ||
            Math.max(y1, y2) < Math.min(y3, y4) ||
            Math.min(y1, y2) > Math.max(y3, y4)
        ) {
            return;
        }

        var nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4),
            ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4),
            denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (!denominator) {
            return;
        }

        let px = (nx / denominator),
            py = (ny / denominator);

        let px2 = +px.toFixed(2),
            py2 = +py.toFixed(2);

        // if final point is on line
        let isOnline = isOnLine(x3, y3, x4, y4, x2, y2, 0.1)

        if (isOnline) {
            return { x: x2, y: y2 };
        }

        if (
            px2 < +Math.min(x1, x2).toFixed(2) ||
            px2 > +Math.max(x1, x2).toFixed(2) ||
            px2 < +Math.min(x3, x4).toFixed(2) ||
            px2 > +Math.max(x3, x4).toFixed(2) ||
            py2 < +Math.min(y1, y2).toFixed(2) ||
            py2 > +Math.max(y1, y2).toFixed(2) ||
            py2 < +Math.min(y3, y4).toFixed(2) ||
            py2 > +Math.max(y3, y4).toFixed(2)
        ) {
            return;
        }

        return { x: px, y: py };
    }

    const isBBoxIntersect = (bbox1, bbox2) => {

        let { x, y, right, bottom } = bbox1;
        let [x2, y2, right2, bottom2] = [bbox2.x, bbox2.y, bbox2.right, bbox2.bottom];

        let bboxIntersection =
            x <= right2 &&
                y <= bottom2 &&
                bottom >= y2 &&
                right >= x2 ?
                true :
                false;

        return bboxIntersection;
    }


    /**
     * get all segment's lengths
     */

    const getLength = (pts, t = 1, lg = 'wa6') => {

        /**
         * for intersections we can 
         * use a sloppy n8 length approximation
         */
        const lgVals = {
            wa6: [[0.4679139345726895, 0.2386191860831969], [0.3607615730481386, 0.6612093864662646], [0.17132449237916234, 0.932469514203152]],
            wa12: [[0.24914704581340288, 0.12523340851146894], [0.23349253653835458, 0.3678314989981802], [0.20316742672306584, 0.5873179542866175], [0.16007832854334633, 0.7699026741943047], [0.10693932599531818, 0.9041172563704748], [0.04717533638650846, 0.9815606342467192]]
        }

        const lineLength = (p1, p2) => {
            return Math.sqrt(
                (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y)
            );
        }

        /**
         * Based on snap.svg bezlen() function
         * https://github.com/adobe-webplatform/Snap.svg/blob/master/dist/snap.svg.js#L5786
         */
        const cubicBezierLength = (p0, cp1, cp2, p, t, lg = 12) => {
            if (t === 0) {
                return 0;
            }

            const base3 = (t, p1, p2, p3, p4) => {
                let t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
                    t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
                return t * t2 - 3 * p1 + 3 * p2;
            };
            t = t > 1 ? 1 : t < 0 ? 0 : t;
            let t2 = t / 2;

            /**
             * set higher legendre gauss weight abscissae values 
             * by more accurate weight/abscissa  lookups 
             * https://pomax.github.io/bezierinfo/legendre-gauss.html
             */

            wa = lgVals[lg]
            let sum = 0;

            for (let i = 0, len = wa.length; i < len; i++) {
                // weight and abscissae 
                let [w, a] = [wa[i][0], wa[i][1]];
                let ct1_t = t2 * a;
                let ct1 = ct1_t + t2;
                let ct0 = -ct1_t + t2;

                let xbase0 = base3(ct0, p0.x, cp1.x, cp2.x, p.x)
                let ybase0 = base3(ct0, p0.y, cp1.y, cp2.y, p.y)
                let comb0 = xbase0 * xbase0 + ybase0 * ybase0;

                let xbase1 = base3(ct1, p0.x, cp1.x, cp2.x, p.x)
                let ybase1 = base3(ct1, p0.y, cp1.y, cp2.y, p.y)
                let comb1 = xbase1 * xbase1 + ybase1 * ybase1;

                sum += w * Math.sqrt(comb0) + w * Math.sqrt(comb1)

            }
            return t2 * sum;
        }


        const quadraticBezierLength = (p0, cp1, p, t, checkFlat = false) => {
            if (t === 0) {
                return 0;
            }
            // is flat/linear – treat as line
            if (checkFlat) {
                let l1 = lineLength(p0, cp1) + lineLength(cp1, p);
                let l2 = lineLength(p0, p);
                if (l1 === l2) {
                    return l2;
                }
            }

            let a, b, c, d, e, e1, d1, v1x, v1y;
            v1x = cp1.x * 2;
            v1y = cp1.y * 2;
            d = p0.x - v1x + p.x;
            d1 = p0.y - v1y + p.y;
            e = v1x - 2 * p0.x;
            e1 = v1y - 2 * p0.y;
            a = 4 * (d * d + d1 * d1);
            b = 4 * (d * e + d1 * e1);
            c = e * e + e1 * e1;

            const bt = b / (2 * a),
                ct = c / a,
                ut = t + bt,
                k = ct - bt ** 2;

            return (
                (Math.sqrt(a) / 2) *
                (ut * Math.sqrt(ut ** 2 + k) -
                    bt * Math.sqrt(bt ** 2 + k) +
                    k *
                    Math.log((ut + Math.sqrt(ut ** 2 + k)) / (bt + Math.sqrt(bt ** 2 + k))))
            );
        }


        let length
        if (pts.length === 4) {
            length = cubicBezierLength(pts[0], pts[1], pts[2], pts[3], t, lg)
        }
        else if (pts.length === 3) {
            length = quadraticBezierLength(pts[0], pts[1], pts[2], t)
        }
        else {
            length = lineLength(pts[0], pts[1])
        }

        return length;
    }

    const getPathDataBBox = (pathData) => {
        // get segment bboxes
        let allX = [];
        let allY = [];
        for (let i = 1; i < pathData.length; i++) {
            let comPrev = pathData[i - 1];
            let valuesPrev = comPrev.values;
            let valuesPrevL = valuesPrev.length;
            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

            let com = pathData[i];
            let { type, values } = com;
            let valuesL = values.length;
            let p = { x: values[valuesL - 2], y: values[valuesL - 1] };
            let cp1, cp2, length, commandBBox;

            let M = pathData[0].values;
            cp1 = valuesL ? { x: values[0], y: values[1] } : M;
            cp2 = type === 'C' ? { x: values[valuesL - 4], y: values[valuesL - 3] } : cp1;

            // get approximated path bbox
            if (valuesL) {
                allX.push(p0.x, cp1.x, cp2.x, p.x);
                allY.push(p0.y, cp1.y, cp2.y, p.y);
            }
        }

        /**
         * total bounding box 
         * (coarse approximation)
         * are two paths remotely intersecting at all
         */
        let minX = Math.min(...allX);
        let minY = Math.min(...allY);
        let maxX = Math.max(...allX);
        let maxY = Math.max(...allY);
        let bb = { x: minX, y: minY, right: maxX, bottom: maxY };

        return bb;
    }

    const commandBBox = (points) => {
        let allX = points.map(pt => { return pt.x })
        let allY = points.map(pt => { return pt.y })

        minX = Math.min(...allX);
        maxX = Math.max(...allX);
        minY = Math.min(...allY);
        maxY = Math.max(...allY);

        bb = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            right: maxX,
            bottom: maxY
        }
        //console.log(bb);
        return bb;
    }

    const isLine = (bez) => {
        return (
            bez[0] === bez[2] &&
            bez[1] === bez[3] &&
            bez[4] === bez[6] &&
            bez[5] === bez[7]
        );
    }




    // all results
    let res = [];

    //no path intersection at all - exit
    let bb1 = getPathDataBBox(pathData1)
    let bb2 = getPathDataBBox(pathData2)

    if (!isBBoxIntersect(bb1, bb2)) {
        return res
    }

    // collect found intersections to exclude duplicates close points
    let xy = {}

    function getPathInfo(pathData) {
        let pathArr = [];
        let M = { x: pathData[0].values[0], y: pathData[0].values[1] }

        pathData.forEach((com, i) => {
            let cpts = [];
            let { type, values } = com;
            let obj = {
                type: type,
                cpts: [],
                len: 0,
                splits: 0,
                dots: [],
                bb: {}
            };

            let valuesL = values.length;
            let comPrev = i > 0 ? pathData[i - 1] : pathData[i]
            let valuesPrev = comPrev.values
            let valuesPrevL = valuesPrev.length


            let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] }
            let p = valuesL ? { x: values[valuesL - 2], y: values[valuesL - 1] } : M;
            let cp1 = valuesL ? { x: values[0], y: values[1] } : p0;
            let cp2 = valuesL > 2 ? { x: values[2], y: values[3] } : p;


            switch (type) {
                // new M
                case 'M':
                    M = { x: p.x, y: p.y };
                    cpts = [];
                    break;
                case 'C':
                    cpts = [p0, cp1, cp2, p];
                    break;

                case 'Q':
                    cpts = [p0, cp1, p];
                    break;

                // treat Z as lineto
                case 'Z':
                case 'z':
                    p = M
                    cpts = [p0, p]
                    break;
                default:
                    cpts = [p0, p];
            }

            if (cpts.length) {

                let l = getLength(cpts);
                let div = Math.ceil(l / sampleDist)
                // ensure minimum precision for short segments
                let splits = cpts.length === 2 || isLine(cpts) ? 1 : (div > 20 ? div : 24) || 1

                obj.cpts = cpts
                obj.len = l
                obj.splits = splits
                obj.bb = commandBBox(cpts)

                for (let i = 0; i < splits + 1; i++) {
                    let t = i / splits
                    let pt = pointAtT(cpts, t);
                    obj.dots.push({ x: pt.x, y: pt.y, t: t });
                }
            }
            pathArr.push(obj)
        })
        return pathArr
    }

    let pathInfo1 = getPathInfo(pathData1)
    let pathInfo2 = getPathInfo(pathData2)

    let quit = false;

    // check segment intersections
    for (let i = 0; i < pathData1.length && !quit; i++) {

        //measure paths
        let data1 = pathInfo1[i];

        if (!data1.cpts.length) {
            continue
        }

        for (var j = 0; j < pathData2.length && !quit; j++) {
            let data2 = pathInfo2[j]
            if (!data2.cpts.length) {
                continue
            }

            if (isBBoxIntersect(data1.bb, data2.bb)) {
                let intersections = findCommandIntersections(data1, data2, xy, stopAtFirst);

                if (stopAtFirst && intersections.length) {
                    quit = true
                }

                for (let k = 0; k < intersections.length; k++) {
                    intersections[k].segment1 = i;
                    intersections[k].segment2 = j;
                    intersections[k].cpts1 = data1.cpts;
                    intersections[k].cpts2 = data2.cpts;
                }
                res = res.concat(intersections);
            }
        }
    }

    return res;
}




function pointAtT(pts, t = 0.5) {

    /**
    * Linear  interpolation (LERP) helper
    */
    const interpolate = (p0, p, t) => {
        return {
            x: (p.x - p0.x) * t + p0.x,
            y: (p.y - p0.y) * t + p0.y
        };
    }

    /**
    * calculate single points on segments
    */
    const getPointAtCubicSegmentT = (p0, cp1, cp2, p, t) => {
        let t1 = 1 - t;
        return {
            x:
                t1 ** 3 * p0.x +
                3 * t1 ** 2 * t * cp1.x +
                3 * t1 * t ** 2 * cp2.x +
                t ** 3 * p.x,
            y:
                t1 ** 3 * p0.y +
                3 * t1 ** 2 * t * cp1.y +
                3 * t1 * t ** 2 * cp2.y +
                t ** 3 * p.y
        };
    }

    const getPointAtQuadraticSegmentT = (p0, cp1, p, t) => {
        let t1 = 1 - t;
        return {
            x: t1 * t1 * p0.x + 2 * t1 * t * cp1.x + t ** 2 * p.x,
            y: t1 * t1 * p0.y + 2 * t1 * t * cp1.y + t ** 2 * p.y
        };
    }

    let pt
    if (pts.length === 4) {
        pt = getPointAtCubicSegmentT(pts[0], pts[1], pts[2], pts[3], t)
    }
    else if (pts.length === 3) {
        pt = getPointAtQuadraticSegmentT(pts[0], pts[1], pts[2], t)
    }
    else {
        pt = interpolate(pts[0], pts[1], t)
    }
    return pt
}



/**
 * parse pathData from d attribute
 * the core function to parse the pathData array from a d string
 **/

function parsePathDataNormalized(d, options = {}) {

    /** 
     * convert arctocommands to cubic bezier
     * based on puzrin's a2c.js
     * https://github.com/fontello/svgpath/blob/master/lib/a2c.js
     * returns pathData array
    */

    const arcToBezier = (p0, values, splitSegments = 1) => {
        let { abs, PI, sin, acos, cos, sqrt } = Math;
        const TAU = PI * 2;
        let [rx, ry, rotation, largeArcFlag, sweepFlag, x, y] = values;

        if (rx === 0 || ry === 0) {
            return []
        }

        let phi = rotation ? rotation * TAU / 360 : 0;
        let sinphi = phi ? sin(phi) : 0
        let cosphi = phi ? cos(phi) : 1
        let pxp = cosphi * (p0.x - x) / 2 + sinphi * (p0.y - y) / 2
        let pyp = -sinphi * (p0.x - x) / 2 + cosphi * (p0.y - y) / 2

        if (pxp === 0 && pyp === 0) {
            return []
        }
        rx = abs(rx)
        ry = abs(ry)
        let lambda =
            pxp * pxp / (rx * rx) +
            pyp * pyp / (ry * ry)
        if (lambda > 1) {
            let lambdaRt = sqrt(lambda);
            rx *= lambdaRt
            ry *= lambdaRt
        }

        /** 
         * parametrize arc to 
         * get center point start and end angles
         */
        let rxsq = rx * rx,
            rysq = rx === ry ? rxsq : ry * ry

        let pxpsq = pxp * pxp,
            pypsq = pyp * pyp
        let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq)

        if (radicant <= 0) {
            radicant = 0
        } else {
            radicant /= (rxsq * pypsq) + (rysq * pxpsq)
            radicant = sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1)
        }

        let centerxp = radicant ? radicant * rx / ry * pyp : 0
        let centeryp = radicant ? radicant * -ry / rx * pxp : 0
        let centerx = cosphi * centerxp - sinphi * centeryp + (p0.x + x) / 2
        let centery = sinphi * centerxp + cosphi * centeryp + (p0.y + y) / 2

        let vx1 = (pxp - centerxp) / rx
        let vy1 = (pyp - centeryp) / ry
        let vx2 = (-pxp - centerxp) / rx
        let vy2 = (-pyp - centeryp) / ry

        // get start and end angle
        const vectorAngle = (ux, uy, vx, vy) => {
            let dot = +(ux * vx + uy * vy).toFixed(9)
            if (dot === 1 || dot === -1) {
                return dot === 1 ? 0 : PI
            }
            dot = dot > 1 ? 1 : (dot < -1 ? -1 : dot)
            let sign = (ux * vy - uy * vx < 0) ? -1 : 1
            return sign * acos(dot);
        }

        let ang1 = vectorAngle(1, 0, vx1, vy1),
            ang2 = vectorAngle(vx1, vy1, vx2, vy2)

        if (sweepFlag === 0 && ang2 > 0) {
            ang2 -= PI * 2
        }
        else if (sweepFlag === 1 && ang2 < 0) {
            ang2 += PI * 2
        }

        let ratio = +(abs(ang2) / (TAU / 4)).toFixed(0)

        // increase segments for more accureate length calculations
        let segments = ratio * splitSegments;
        ang2 /= segments
        let pathDataArc = [];


        // If 90 degree circular arc, use a constant
        // https://pomax.github.io/bezierinfo/#circles_cubic
        // k=0.551784777779014
        const angle90 = 1.5707963267948966;
        const k = 0.551785
        let a = ang2 === angle90 ? k :
            (
                ang2 === -angle90 ? -k : 4 / 3 * tan(ang2 / 4)
            );

        let cos2 = ang2 ? cos(ang2) : 1;
        let sin2 = ang2 ? sin(ang2) : 0;
        let type = 'C'

        const approxUnitArc = (ang1, ang2, a, cos2, sin2) => {
            let x1 = ang1 != ang2 ? cos(ang1) : cos2;
            let y1 = ang1 != ang2 ? sin(ang1) : sin2;
            let x2 = cos(ang1 + ang2);
            let y2 = sin(ang1 + ang2);

            return [
                { x: x1 - y1 * a, y: y1 + x1 * a },
                { x: x2 + y2 * a, y: y2 - x2 * a },
                { x: x2, y: y2 }
            ];
        }

        for (let i = 0; i < segments; i++) {
            let com = { type: type, values: [] }
            let curve = approxUnitArc(ang1, ang2, a, cos2, sin2);

            curve.forEach((pt) => {
                let x = pt.x * rx
                let y = pt.y * ry
                com.values.push(cosphi * x - sinphi * y + centerx, sinphi * x + cosphi * y + centery)
            })
            pathDataArc.push(com);
            ang1 += ang2
        }

        return pathDataArc;
    }


    d = d
        // remove new lines, tabs an comma with whitespace
        .replace(/[\n\r\t|,]/g, " ")
        // pre trim left and right whitespace
        .trim()
        // add space before minus sign
        .replace(/(\d)-/g, '$1 -')
        // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
        .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, "$1$3 ")

    let pathData = [];
    let cmdRegEx = /([mlcqazvhst])([^mlcqazvhst]*)/gi;
    let commands = d.match(cmdRegEx);

    // valid command value lengths
    let comLengths = { m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0 };

    options = {
        ...{
            toAbsolute: true,
            toLonghands: true,
            arcToCubic: true,
            arcAccuracy: 1,
        },
        ...options
    }

    let { toAbsolute, toLonghands, arcToCubic, arcAccuracy } = options;
    let hasArcs = /[a]/gi.test(d);
    let hasShorthands = toLonghands ? /[vhst]/gi.test(d) : false;
    let hasRelative = toAbsolute ? /[lcqamts]/g.test(d.substring(1, d.length - 1)) : false;

    // offsets for absolute conversion
    let offX, offY, lastX, lastY;

    for (let c = 0; c < commands.length; c++) {
        let com = commands[c];
        let type = com.substring(0, 1);
        let typeRel = type.toLowerCase();
        let typeAbs = type.toUpperCase();
        let isRel = type === typeRel;
        let chunkSize = comLengths[typeRel];

        // split values to array
        let values = com.substring(1, com.length)
            .trim()
            .split(" ").filter(Boolean);

        /**
         * A - Arc commands
         * large arc and sweep flags
         * are boolean and can be concatenated like
         * 11 or 01
         * or be concatenated with the final on path points like
         * 1110 10 => 1 1 10 10
         */
        if (typeRel === "a" && values.length != comLengths.a) {

            let n = 0,
                arcValues = [];
            for (let i = 0; i < values.length; i++) {
                let value = values[i];

                // reset counter
                if (n >= chunkSize) {
                    n = 0;
                }
                // if 3. or 4. parameter longer than 1
                if ((n === 3 || n === 4) && value.length > 1) {
                    let largeArc = n === 3 ? value.substring(0, 1) : "";
                    let sweep = n === 3 ? value.substring(1, 2) : value.substring(0, 1);
                    let finalX = n === 3 ? value.substring(2) : value.substring(1);
                    let comN = [largeArc, sweep, finalX].filter(Boolean);
                    arcValues.push(comN);
                    n += comN.length;


                } else {
                    // regular
                    arcValues.push(value);
                    n++;
                }
            }
            values = arcValues.flat().filter(Boolean);
        }

        // string  to number
        values = values.map(Number)

        // if string contains repeated shorthand commands - split them
        let hasMultiple = values.length > chunkSize;
        let chunk = hasMultiple ? values.slice(0, chunkSize) : values;
        let comChunks = [{ type: type, values: chunk }];

        // has implicit or repeated commands – split into chunks
        if (hasMultiple) {
            let typeImplicit = typeRel === "m" ? (isRel ? "l" : "L") : type;
            for (let i = chunkSize; i < values.length; i += chunkSize) {
                let chunk = values.slice(i, i + chunkSize);
                comChunks.push({ type: typeImplicit, values: chunk });
            }
        }

        // no relative, shorthand or arc command - return current 
        if (!hasRelative && !hasShorthands && !hasArcs) {
            comChunks.forEach((com) => {
                pathData.push(com);
            });
        }

        /**
         * convert to absolute 
         * init offset from 1st M
         */
        else {
            if (c === 0) {
                offX = values[0];
                offY = values[1];
                lastX = offX;
                lastY = offY;
            }

            let typeFirst = comChunks[0].type;
            typeAbs = typeFirst.toUpperCase()

            // first M is always absolute
            isRel = typeFirst.toLowerCase() === typeFirst && pathData.length ? true : false;

            for (let i = 0; i < comChunks.length; i++) {
                let com = comChunks[i];
                let type = com.type;
                let values = com.values;
                let valuesL = values.length;
                let comPrev = comChunks[i - 1]
                    ? comChunks[i - 1]
                    : c > 0 && pathData[pathData.length - 1]
                        ? pathData[pathData.length - 1]
                        : comChunks[i];

                let valuesPrev = comPrev.values;
                let valuesPrevL = valuesPrev.length;
                isRel = comChunks.length > 1 ? type.toLowerCase() === type && pathData.length : isRel;

                if (isRel) {
                    com.type = comChunks.length > 1 ? type.toUpperCase() : typeAbs;

                    switch (typeRel) {
                        case "a":
                            com.values = [
                                values[0],
                                values[1],
                                values[2],
                                values[3],
                                values[4],
                                values[5] + offX,
                                values[6] + offY
                            ];
                            break;

                        case "h":
                        case "v":
                            com.values = type === "h" ? [values[0] + offX] : [values[0] + offY];
                            break;

                        case "m":
                        case "l":
                        case "t":
                            com.values = [values[0] + offX, values[1] + offY];
                            break;

                        case "c":
                            com.values = [
                                values[0] + offX,
                                values[1] + offY,
                                values[2] + offX,
                                values[3] + offY,
                                values[4] + offX,
                                values[5] + offY
                            ];
                            break;

                        case "q":
                        case "s":
                            com.values = [
                                values[0] + offX,
                                values[1] + offY,
                                values[2] + offX,
                                values[3] + offY
                            ];
                            break;
                    }
                }
                // is absolute
                else {
                    offX = 0;
                    offY = 0;
                }

                /**
                 * convert shorthands
                 */
                if (hasShorthands) {
                    let cp1X, cp1Y, cpN1X, cpN1Y, cp2X, cp2Y;
                    if (com.type === "H" || com.type === "V") {
                        com.values =
                            com.type === "H" ? [com.values[0], lastY] : [lastX, com.values[0]];
                        com.type = "L";
                    } else if (com.type === "T" || com.type === "S") {
                        [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                        [cp2X, cp2Y] =
                            valuesPrevL > 2
                                ? [valuesPrev[2], valuesPrev[3]]
                                : [valuesPrev[0], valuesPrev[1]];

                        // new control point
                        cpN1X = com.type === "T" ? lastX * 2 - cp1X : lastX * 2 - cp2X;
                        cpN1Y = com.type === "T" ? lastY * 2 - cp1Y : lastY * 2 - cp2Y;

                        com.values = [cpN1X, cpN1Y, com.values].flat();
                        com.type = com.type === "T" ? "Q" : "C";

                    }
                }

                /**
                 * convert arcs if elliptical
                 */
                let isElliptic = false;

                if (hasArcs && com.type === 'A') {

                    p0 = { x: lastX, y: lastY }
                    if (typeRel === 'a') {
                        isElliptic = com.values[0] === com.values[1] ? false : true;

                        if (isElliptic || arcToCubic) {
                            let comArc = arcToBezier(p0, com.values, arcAccuracy)
                            comArc.forEach(seg => {
                                pathData.push(seg);
                            })

                        } else {
                            pathData.push(com);
                        }
                    }
                }

                else {
                    // add to pathData array
                    pathData.push(com);
                }

                // update offsets
                lastX =
                    valuesL > 1
                        ? values[valuesL - 2] + offX
                        : typeRel === "h"
                            ? values[0] + offX
                            : lastX;
                lastY =
                    valuesL > 1
                        ? values[valuesL - 1] + offY
                        : typeRel === "v"
                            ? values[0] + offY
                            : lastY;
                offX = lastX;
                offY = lastY;
            }
        }
    }

    /**
     * first M is always absolute/uppercase -
     * unless it adds relative linetos
     * (facilitates d concatenating)
     */
    pathData[0].type = "M";
    return pathData;
}


	pathIntersections.findPathIntersections=findPathIntersections;
	pathIntersections.checkPathIntersection=checkPathIntersection;
	pathIntersections.findPathDataIntersections=findPathDataIntersections;
	pathIntersections.pointAtT=pointAtT;
	pathIntersections.parsePathDataNormalized=parsePathDataNormalized;
	return pathIntersections;
  
});

if (typeof module === 'undefined') {
	var {findPathIntersections, checkPathIntersection, findPathDataIntersections, pointAtT, parsePathDataNormalized}=pathIntersections;
}