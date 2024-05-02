# svg-path-intersections
A standalone library to get intersections between two SVG paths. 
~ 9KB minified/ 4KB gzipped.  

It includes a path data parser compliant with the [W3C SVGPathData interface draft](https://svgwg.org/specs/paths/#InterfaceSVGPathData) and can handle all minified stringified path data inputs (especially `A` commands with concatenated largeArc, sweep and final on-path parameters "bomb" quite a few other libraries).  

## Usage 
You can either pass a stringified path data 

```
let intersections = findPathIntersections(d1, d2)
```

or  use it alongside with other path data parsers like [Jarek Foksa's pathdata-polyfill](https://github.com/jarek-foksa/path-data-polyfill) and pass already parsed path data arrays to the `findPathDataIntersections()` method.

```
let intersections = findPathDataIntersections(pathData1, pathData2)
```


### Browser

```
<script src="https://cdn.jsdelivr.net/npm/svg-path-intersections@1.0.1/js/svg-path-intersections_standalone.min.js"></script>
```  

```
let d1 = 'M 75 0 a 1 1 45 010 100 1 1 45 010 -100'
let d2 = 'M 50 0 a 1 1 45 010 100 1 1 45 010 -100'

let intersections= findPathIntersections(d1, d2);
console.log(JSON.stringify(intersections, null, ' '));

```

### Node
```
const pathIntersections = require('svg-path-intersections');
const {findPathIntersections, checkPathIntersection, findPathDataIntersections, pointAtT, parsePathDataNormalized} = pathIntersections;


let d1 = 'M 75 0 a 1 1 45 010 100 1 1 45 010 -100'
let d2 = 'M 50 0 a 1 1 45 010 100 1 1 45 010 -100'

let intersections= findPathIntersections(d1, d2);
console.log(JSON.stringify(intersections, null, ' '));

```

### Demos
* [Codepen: multiple path examples and speed test](https://codepen.io/herrstrietzel/pen/bGJyOXB)

### Output 

The returned intersection array contains: 
* x/y coordinates for each intersection
* `t1` and `t2` values for 1. and 2. path segments
* segment indices (at which intersection occurred)
* segment command points (`cpts1` and `cpts2`)

This way, you can calculate coordinates for both paths or split each path at `t` values.

```
[
 {
  "x": 62.50000000097887,
  "y": 98.40012176975786,
  "t1": 0.15651097923256496,
  "t2": 0.8434890204109524,
  "segment1": 3,
  "segment2": 2,
  "cpts1": [
   {
    "x": 74.99999998680912,
    "y": 100
   },
   {
    "x": 47.410749986809115,
    "y": 99.99999999272146
   },
   {
    "x": 24.999999992721463,
    "y": 77.5892499868091
   },
   {
    "x": 25.000000000000014,
    "y": 49.9999999868091
   }
  ],
  "cpts2": [
   {
    "x": 100,
    "y": 50.000000013190885
   },
   {
    "x": 99.99999999272146,
    "y": 77.58925001319088
   },
   {
    "x": 77.58924998680911,
    "y": 100.00000000727853
   },
   {
    "x": 49.999999986809115,
    "y": 100
   }
  ]
 },
 {
  "x": 62.49999999505845,
  "y": 1.5998782311929203,
  "t1": 0.8434890203595754,
  "t2": 0.15651097928396177,
  "segment1": 4,
  "segment2": 1,
  "cpts1": [
   {
    "x": 25.000000000000014,
    "y": 49.9999999868091
   },
   {
    "x": 25.000000007278558,
    "y": 22.41074998680911
   },
   {
    "x": 47.410750013190906,
    "y": -7.278536884314235e-9
   },
   {
    "x": 75.0000000131909,
    "y": 1.4210854715202004e-14
   }
  ],
  "cpts2": [
   {
    "x": 50,
    "y": 0
   },
   {
    "x": 77.58925001319088,
    "y": 7.278543989741593e-9
   },
   {
    "x": 100.00000000727853,
    "y": 22.4107500131909
   },
   {
    "x": 100,
    "y": 50.000000013190885
   }
  ]
 }
]
```

### Adjacent "touching" paths
Unlike other libraries path-intersections will also detect touching paths.

![touching points](https://raw.githubusercontent.com/herrstrietzel/svg-path-intersections/main/img/touching-paths.png)


## Similar libraries
* [thelonious's "kld-intersections"](https://github.com/thelonious/kld-intersections)
* [Pomax's "bezierjs"](https://github.com/Pomax/bezierjs)
* [bpmn-io's "path-intersection"](https://github.com/bpmn-io/path-intersection)



## Credits

* Jarek Foksa for his [great polyfill](https://github.com/jarek-foksa/path-data-polyfill) heavily inspring to adopt the new pathData interface methodology and for contributing to the specification
* Dmitry Baranovskiy for (raphael.j/snap.svg) [pathToAbsolute/Relative functions](https://github.com/DmitryBaranovskiy/raphael/blob/master/raphael.js#L1848) 
* Vitaly Puzrin (fontello) for the arc to cubic conversion method  [a2c.js](https://github.com/fontello/svgpath/blob/master/lib/a2c.js) and [cubic to quadratic approximation](https://github.com/fontello/cubic2quad/blob/master/test/cubic2quad.js)
* Mike "POMAX" Kammermans for his great [A Primer on Bézier Curves](https://pomax.github.io/bezierinfo)