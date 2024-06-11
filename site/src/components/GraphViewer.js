import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import Panzoom from '@panzoom/panzoom';

const GraphViewer = ({ graph, containerId, onNodeHighlight, diffHighlights }) => {
  const containerRef = useRef(null);

  useEffect(() => {
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
      // console.log("rendering in diffHighlights", diffHighlights);
      let modifiedGraph = graph;
      if (diffHighlights.length > 0) {
      // Iter over diffHighlights and search and replace for each substr
        diffHighlights.forEach(highlight => {
          const [style, position] = highlight.split(' ');
          const regex = new RegExp(`(${style} ${position})`, 'g');
          modifiedGraph = modifiedGraph.replace(regex, `$1 fill:#b8a75a,`);
        });
        // console.log(modifiedGraph);
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

        // Initialize panzoom on the rendered element
        const panzoom = Panzoom(element, {
          maxScale: 30,
          step: 0.07,
        });
        element.parentElement.addEventListener('wheel', panzoom.zoomWithWheel);
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
          // subgraph.classList.add(description);
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
            // console.log("mouseenter");
            // console.log(el.classList);
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

            let maybeLineage = lineages.get(el);
            if (maybeLineage) {
              let lineage = maybeLineage[0];
              let subgraphs = maybeLineage[1];
              allNodes.map((node) => {
                if (lineage.has(node)) {
                } else {
                  node.setAttribute("style", "filter: grayscale(100%) brightness(50%)");
                }
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
                linksElems.map((linkElem) => {
                  connected.add(linkElem);
                  let subgraph = document.querySelector("." + [...el.classList].filter((maybeSubgraph) => maybeSubgraph.startsWith("cluster_"))[0]);
                  if (subgraph) {
                    subgraphs.add(subgraph);
                  }
                });
              }

              lineages.set(el, [connected, subgraphs]);

              allNodes.map((node) => {
                if (connected.has(node)) {
                } else {
                  node.setAttribute("style", "filter: grayscale(100%) brightness(50%)");
                }
              });
            }
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

    if (graph) {
      renderMermaid();
    }
  }, [diffHighlights]);

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