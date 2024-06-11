import { StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import React, { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { solidity } from '@replit/codemirror-lang-solidity';
import '../App.css';
import { oneDark } from '@codemirror/theme-one-dark';
import { RangeSetBuilder } from '@codemirror/state';

// Add the highlight theme to the editor state
const SourceViewer = ({ sourceCode, locToHighlight, forksToHighlight }) => {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
  
    useEffect(() => {
      if (editorRef.current && sourceCode !== null && sourceCode !== undefined) {
        let start = 0;
        let end = 0;
        let file_number = 0;
        if (locToHighlight) {
            const { file_number: fn, start: s, end: e } = locToHighlight;
            const parsedFileNumber = parseInt(fn, 10);
            const parsedStart = parseInt(s, 10);
            const parsedEnd = parseInt(e, 10);
            if (!isNaN(parsedFileNumber) && !isNaN(parsedStart) && !isNaN(parsedEnd)) {
                file_number = parsedFileNumber;
                start = parsedStart;
                end = parsedEnd;
            } else {
                console.error("Invalid locToHighlight values", locToHighlight);
            }
        }

        const highlightDeco = Decoration.mark({
            class: 'loc-highlight'
        });

        const forkDecos = forksToHighlight.map(fork => {
            const { file_number: fn, start: s, end: e, edge } = fork;
            const parsedFileNumber = parseInt(fn, 10);
            const parsedStart = parseInt(s, 10);
            const parsedEnd = parseInt(e, 10);
            if (isNaN(parsedFileNumber) || isNaN(parsedStart) || isNaN(parsedEnd)) {
                console.error("Invalid fork values", fork);
                return null;
            }
            const className = edge ? 'fork-true-highlight' : 'fork-false-highlight';
            return {from: parsedStart, to: parsedEnd, deco: Decoration.mark({ class: className })};
        }).filter(deco => deco !== null);

        const highlightField = StateField.define({
            create() {
                const builder = new RangeSetBuilder();
                const ranges = [
                    { from: start, to: end, deco: highlightDeco },
                    ...forkDecos.map(deco => ({ from: deco.from, to: deco.to, deco: deco.deco }))
                ];

                // Sort ranges by `from` position
                ranges.sort((a, b) => a.from - b.from);
                ranges.forEach(({ from, to, deco }) => builder.add(from, to, deco));
                return builder.finish();
            },
            update(deco, tr) {
                if (tr.docChanged) {
                    const builder = new RangeSetBuilder();
                    const ranges = [
                        { from: start, to: end, deco: highlightDeco },
                        ...forkDecos.map(deco => ({ from: deco.from, to: deco.to, deco: deco.deco }))
                    ];

                    // Sort ranges by `from` position
                    ranges.sort((a, b) => a.from - b.from);
                    ranges.forEach(({ from, to, deco }) => builder.add(from, to, deco));
                    return builder.finish();
                }
                return deco;
            },
            provide: f => EditorView.decorations.from(f)
        });

        const state = EditorState.create({
          doc: sourceCode,
          extensions: [
            basicSetup,
            EditorView.editable.of(false), // Make the editor read-only
            solidity,
            oneDark,
            highlightField,
          ]
        });
  
        // Create a new EditorView instance
        viewRef.current = new EditorView({
          state,
          parent: editorRef.current
        });
  
        // Cleanup function to destroy the view when the component unmounts
        return () => {
          viewRef.current.destroy();
        };
      }
    }, [sourceCode, locToHighlight, forksToHighlight]);
  
    return (
      <div ref={editorRef} className="editor-container" />
    );
  };
  
  export default SourceViewer;