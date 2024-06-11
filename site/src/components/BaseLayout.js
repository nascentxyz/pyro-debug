
const baseLayoutConfig = {
    global: {
      tabSetEnableSingleTabStretch: true,
      // all of the below are disabled since i cant figure out how to still parse the layout after its rearranged
      tabEnableFloat: false,
      tabEnableRename: false,
      tabEnableClose: false,
      tabEnableDrag: false,
      tabSetEnableRename: false,
      tabSetEnableClose: false,
      tabSetEnableDrop: false,
      tabSetEnableDrag: false,
      tabSetEnableDivide: false,
      tabSetEnableHide: false,
      borderEnableDrop: false,
      borderEnableDrag: false,
      borderEnableDivide: false,
      borderEnableHide: false,
    },
    borders: [],
    "layout": {
      "type": "row",
      "id": "1",
      "children": [
        {
          "type": "row",
          "id": "#73f3bd5f-a607-482e-80d7-ae498a710838",
          "children": [
            {
              "type": "row",
              "id": "#23c41672-de3f-400f-89d4-7fdc26520c1c",
              "weight": 95.0,
              "children": [
                {
                  "type": "tabset",
                  "id": "#d3db0630-4d2a-4c8d-928b-e46e0179ee1e",
                  "weight": 0.5,
                  "children": [
                    {
                      "type": "tab",
                      "id": "#46f6668f-a558-4938-bd06-9b011a710c6f",
                      "name": "HistoryControls",
                      "component": "HistoryControls",
                    }
                  ]
                },
                {
                  "type": "tabset",
                  "id": "#806b79e7-9444-4bc0-a695-097ed1150829",
                  "weight": 7.5,
                  "children": [
                    {
                      "type": "tab",
                      "id": "#e7927688-adb5-4b8d-951d-29d0eb6e6464",
                      "name": "GraphViewer",
                      "component": "GraphViewer",
                      "config": {
                        "graph": null
                      }
                    }
                  ],
                  "active": true
                },
                {
                  "type": "row",
                  "id": "#bd497653-2ba9-499e-bfb1-6ebf6754e456",
                  "weight": 3.0,
                  "children": [
                    {
                      "type": "tabset",
                      "id": "#8fecb55e-2302-48c3-8f92-2e238206c94a",
                      "weight": 61.0,
                      "children": [
                        {
                          "type": "tab",
                          "id": "#d4d99ab8-7dcb-4312-8c2b-0249965c1a46",
                          "name": "SourceViewer",
                          "component": "SourceViewer",
                          "config": {
                            "sourceCode": null,
                            "file_number": null
                          }
                        }
                      ]
                    },
                    {
                      "type": "tabset",
                      "id": "#2fdcce56-d472-408d-958a-7cb14f3e3429",
                      "weight": 39.0,
                      "children": [
                        {
                          "type": "tab",
                          "id": "#73904e58-425c-496c-bff5-9802bee236b1",
                          "name": "DiffViewer",
                          "component": "DiffViewer",
                          "config": {
                            "graph1": null,
                            "graph2": null
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "type": "tabset",
              "id": "#3a60384f-7190-4943-a5af-3230dcca2d7a",
              "weight": 5.0,
              "children": [
                {
                  "type": "tab",
                  "id": "#626ec020-ff89-4313-89a1-be4480b2fef4",
                  "name": "ArenaViewer",
                  "component": "ArenaViewer",
                }
              ]
            }
          ]
        }
      ]
    }
  };

export default baseLayoutConfig;

