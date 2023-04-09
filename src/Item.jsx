import React, { useMemo } from 'react'
import { Slate, Editable, withReact, useSlate, useFocused } from 'slate-react'
import { withHistory } from 'slate-history'
import { Editor, Transforms, Range, createEditor } from 'slate'

import './Item.css'

export default function Item() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  const initialValue = useMemo(() => {
    return JSON.parse(localStorage.getItem('content')) || [{ children: [{ text: 'Type something here...' }] }]
  }, [])

  return (
    <Slate
      editor={editor}
      value={initialValue}
      onChange={value => {
        if (editor.operations.some(op => op.type !== 'set_selection')) {
          localStorage.setItem('content', JSON.stringify(value))
        }
      }}
    >
      <CommandGroup />
      <Editable
        renderLeaf={props => <TextNode {...props} />}
        onMouseMove={event => {
          editor.mouse = { x: event.clientX, y: event.clientY }
        }}
      />
    </Slate>
  )
}

const TextNode = ({ attributes, children, text }) => {
  return <span {...attributes} className={Object.hasOwn(text, 'star') ? ('hidden' + (text.star ? ' star' : '')) : ''}>{children}</span>
}

const CommandGroup = () => {
  const editor = useSlate()

  const Button = ({ callback, text }) => {
    return <button class='command-button' onClick={() => callback(editor)}>{text}</button>
  }

  const focused = useFocused()
  const { selection } = editor
  const [first, next] = Editor.nodes(editor, { match: node => Object.hasOwn(node, 'star'), mode: 'all' })

  if (!focused || !selection || !first && (Range.isCollapsed(selection) || Editor.string(editor, selection) === '')) {
    return null
  }

  return (
    <div
      className='command-group'
      style={{ left: editor.mouse.x + 20 + 'px', top: editor.mouse.y + 20 + 'px' }}
      onMouseDown={event => event.preventDefault()}
    >
      {
        !first ? (
          <React.Fragment>
            <Button callback={hide} text='hide' />
            <Button callback={star} text='star' />
          </React.Fragment>
        ) : !next ? (
          <React.Fragment>
            {
              !first.at(0).star ? (
                <Button callback={star_all} text='star' />
              ) : (
                <Button callback={unstar_all} text='unstar' />
              )
            }
            <Button callback={show_all} text='show' />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Button callback={star_all} text='star' />
            <Button callback={unstar_all} text='unstar' />
            <Button callback={show_all} text='show' />
          </React.Fragment>
        )
      }
    </div>
  )
}

const hide = editor => {
  Transforms.setNodes(
    editor,
    { ['star']: false },
    { match: () => true, split: true }
  )
}

const star = editor => {
  Transforms.setNodes(
    editor,
    { ['star']: true },
    { match: () => true, split: true }
  )
}

const star_all = editor => {
  Transforms.setNodes(
    editor,
    { ['star']: true },
    { match: node => Object.hasOwn(node, 'star') }
  )
}

const unstar_all = editor => {
  Transforms.setNodes(
    editor,
    { ['star']: false },
    { match: node => Object.hasOwn(node, 'star') }
  )
}

const show_all = editor => {
  Transforms.unsetNodes(
    editor,
    'star',
    { match: () => true }
  )
}
