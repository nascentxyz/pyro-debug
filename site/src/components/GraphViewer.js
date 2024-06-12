import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import Panzoom from '@panzoom/panzoom';

const GraphViewer = ({ graph, containerId, onNodeHighlight, diffHighlights, sourceHoverPos }) => {
  const containerRef = useRef(null);
  const lazySortedLocsRef = useRef(null);
  const panzoomRef = useRef(null);
  const previousDiffHighlights = useRef([]);

  const highlightNodes = (elements, lineages, allNodes) => {

    // If elements is null, make all nodes gray and exit
    if (!elements) {
      // Apply the filter to all nodes initially
      allNodes.forEach((node) => {
        node.setAttribute("style", "filter: grayscale(100%) brightness(50%)");
      });
      return;
    }

    // Ensure elements is an array
    if (!Array.isArray(elements)) {
      elements = [elements];
    }
  
    // Apply the filter to all nodes initially
    allNodes.forEach((node) => {
      node.setAttribute("style", "filter: grayscale(100%) brightness(50%)");
    });
  
    const allConnectedNodes = new Set();
  
    elements.forEach(el => {
      let maybeLineage = lineages.get(el);
      if (maybeLineage) {
        let lineage = maybeLineage[0];
        lineage.forEach((node) => {
          allConnectedNodes.add(node);
        });
      } else {
        let subgraphs = new Set();
        let subgraph = document.querySelector("." + [...el.classList].filter((maybeSubgraph) => maybeSubgraph.startsWith("cluster_"))[0]);
        if (subgraph) {
          subgraphs.add(subgraph);
        }
        let seen_subgraphs = recurseLinks(el, new Set(), subgraphs);
        let connected = seen_subgraphs[0];
        subgraphs = seen_subgraphs[1];
  
        // Get one set of forward links
        let edges = [...el.classList].filter((maybeLink) => maybeLink.startsWith("linkSource"));
        let linkTargets = edges.map((edge) => {
          return "svg .linkTarget" + edge.slice(10);
        }).join(", ");
  
        if (linkTargets.length > 0) {
          let linksElems = Array.from(document.querySelectorAll(linkTargets)).flat(Infinity);
          linksElems.forEach((linkElem) => {
            connected.add(linkElem);
            let subgraph = document.querySelector("." + [...el.classList].filter((maybeSubgraph) => maybeSubgraph.startsWith("cluster_"))[0]);
            if (subgraph) {
              subgraphs.add(subgraph);
            }
          });
        }
  
        lineages.set(el, [connected, subgraphs]);
        connected.forEach((node) => {
          allConnectedNodes.add(node);
        });
      }
    });
  
    // Remove the style for all connected nodes
    allConnectedNodes.forEach((node) => {
      node.removeAttribute("style");
    });
  };

  const recurseLinks = (elem, seen, subgraphs) => {
    if (seen.has(elem)) {
      return [seen, subgraphs];
    } else {
      seen.add(elem);
    }
    let edges = [...elem.classList].filter((maybeLink) => maybeLink.startsWith("linkTarget"));
    let subgraph = document.querySelector("." + [...elem.classList].filter((maybeSubgraph) => maybeSubgraph.startsWith("cluster_"))[0]);
    if (subgraph) {
      subgraphs.add(subgraph);
    }
    let linkSources = edges.map((edge) => {
      return "svg .linkSource" + edge.slice(10);
    }).join(", ");
    if (linkSources.length > 0) {
      let linksElems = Array.from(document.querySelectorAll(linkSources)).flat(Infinity);
      linksElems.map((linkElem) => {
        let ret = recurseLinks(linkElem, seen, subgraphs);
        seen = ret[0];
        subgraphs = ret[1];
      });
      return [seen, subgraphs];
    } else {
      return [seen, subgraphs];
    }
  };

  const renderMermaid = async () => {
    const container = containerRef.current;
    container.innerHTML = ''; // Clear previous content
    let modifiedGraph = graph;
    if (diffHighlights.length > 0) {
      diffHighlights.forEach(highlight => {
        const [style, position] = highlight.split(' ');
        const regex = new RegExp(`(${style} ${position})`, 'g');
        modifiedGraph = modifiedGraph.replace(regex, `$1 fill:#b8a75a,`);
      });
    }
    mermaid.initialize({
      maxTextSize: 1000000
    });

    try {
      const { svg } = await mermaid.render('mermaid', modifiedGraph);
      const element = document.createElement('div');
      element.innerHTML = svg;
      element.className = 'graph-content';
      container.appendChild(element);

      // Initialize panzoom only once
      if (!panzoomRef.current) {
        panzoomRef.current = Panzoom(element, {
          maxScale: 30,
          step: 0.07,
        });
        element.parentElement.addEventListener('wheel', panzoomRef.current.zoomWithWheel);
      }

      // Your node highlighting and event listener logic here
      // Highlighting logic
      const allSubgraphs = Array.from(document.querySelectorAll(".subgraph:not(.node)"));
      allSubgraphs.map((subgraph) => {
        let label = subgraph.querySelector("*> .nodeLabel");
        let description = label.innerHTML;
        let color = "#" + description.split("bgcolor_")[1];
        Array.from(subgraph.childNodes).map((node) => {
          if (Array.from(node.classList).includes("node")) {
            node.style.fill = color;
          }
        });
        if (description) { // Ensure description is not empty
          subgraph.classList.add(description);
        }
        label.innerHTML = "";
      });

      Array.from(document.querySelectorAll(".path")).map((path) => {
        path.setAttribute("style", "stroke: orange;");
      });

      const allNodes = Array.from(document.querySelectorAll('svg .node:not(.subgraph)'));
      const lineages = new Map();

      // Add event listeners
      allNodes.forEach(function(el) {
        el.addEventListener("mouseenter", (event) => {
          // Find the class that matches the pattern loc_0_108_113
          const locClass = [...el.classList].find(cls => cls.match(/loc_\d+_\d+_\d+/));
          let loc = null;
          let forks = [];

          if (locClass) {
            const locMatch = locClass.match(/loc_(\d+)_(\d+)_(\d+)/);
            // console.log(`entered ${locMatch[1]} ${locMatch[2]} ${locMatch[3]}`);
            loc = {
              file_number: locMatch[1],
              start: locMatch[2],
              end: locMatch[3]
            };
          }

          const forksClasses = [...el.classList].filter(cls => cls.match(/fork_\d+_\d+_\d+_(true|false)$/));
          forksClasses.forEach(forksClass => {
            const forkMatch = forksClass.match(/fork_(\d+)_(\d+)_(\d+)_(true|false)$/);
            // console.log(`entered ${forkMatch[1]} ${forkMatch[2]} ${forkMatch[3]} ${forkMatch[4]}`);
            forks.push({
              file_number: forkMatch[1],
              start: forkMatch[2],
              end: forkMatch[3],
              edge: forkMatch[4] === "true"
            });
          });

          onNodeHighlight(loc, forks);
          highlightNodes(el, lineages, allNodes);
        });

        el.addEventListener("mouseleave", (event) => {
          // Call onNodeHighlight with null
          // console.log("mouseleave");
          onNodeHighlight(null, []);

          let maybeLineage = lineages.get(el);
          if (maybeLineage) {
            let lineage = maybeLineage[0];
            let graphs = maybeLineage[1];
            allNodes.map((node) => {
              if (lineage.has(node)) {
              } else {
                node.removeAttribute("style");
              }
            });
          }
        });
      });

    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    lazySortedLocsRef.current = null;

    if (JSON.stringify(diffHighlights) !== JSON.stringify(previousDiffHighlights.current)) {
      previousDiffHighlights.current = diffHighlights;
      if (graph) {
        renderMermaid();
      }
    }
  }, [diffHighlights, graph]);

  useEffect(() => {
    if (sourceHoverPos) {
      const { file_number, pos } = sourceHoverPos;
      // find the node that has the matching file_number and the closest start. on ties, pick the smallest start-end range

      // find all loc_ classes and sort them by file_number, start, then start-end minimizing the difference between start and end.
      //   and then cache the sorted list of nodes
      if (!lazySortedLocsRef.current) {
        const allLocs = Array.from(document.querySelectorAll('svg .node:not(.subgraph)'))
          .map(node => {
            const locClass = [...node.classList].find(cls => cls.match(/loc_\d+_\d+_\d+/));
            if (locClass) {
              const locMatch = locClass.match(/loc_(\d+)_(\d+)_(\d+)/);
              return {
                node,
                file_number: parseInt(locMatch[1], 10),
                start: parseInt(locMatch[2], 10),
                end: parseInt(locMatch[3], 10)
              };
            }
            return null;
          })
          .filter(loc => loc !== null)
          .sort((a, b) => {
            if (a.file_number !== b.file_number) {
              return a.file_number - b.file_number;
            }
            if (a.start !== b.start) {
              return a.start - b.start;
            }
            return (a.end - a.start) - (b.end - b.start);
          });

        lazySortedLocsRef.current = allLocs;
      }

      // Find the nodes with the matching file_number, the closest start, and the smallest range of start<>end
      const closestNodes = lazySortedLocsRef.current.reduce((closest, loc) => {
        if (Number(loc.file_number) === Number(file_number)) {
          if (!closest.length) {
            return [loc];
          }

          const currentClosest = closest[0];
          const currentDistance = Math.abs(currentClosest.start - pos);
          const newDistance = Math.abs(loc.start - pos);

          if (newDistance < currentDistance) {
            return [loc];
          } else if (newDistance === currentDistance) {
            const currentRange = currentClosest.end - currentClosest.start;
            const newRange = loc.end - loc.start;

            if (newRange < currentRange) {
              return [loc];
            } else if (newRange === currentRange) {
              return [...closest, loc];
            }
          }
        }
        return closest;
      }, []);

      if (closestNodes.length > 0) {
        const allNodes = Array.from(document.querySelectorAll('svg .node:not(.subgraph)'));
        const lineages = new Map();
        const closestNodesNodes = closestNodes.map(node => node.node);
        highlightNodes(closestNodesNodes, lineages, allNodes);
      } else {
        const allNodes = Array.from(document.querySelectorAll('svg .node:not(.subgraph)'));
        highlightNodes(null, new Map(), allNodes);
      }
    }
  }, [sourceHoverPos]);

  return (
    <div
      id={containerId}
      ref={containerRef}
      className="graph-visualizer"
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
    ></div>
  );
};

export default GraphViewer;
