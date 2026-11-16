import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'teardown-ledger',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

const engine = (on: On) => {
  on('ui.render', ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    return Box({ children: Text({ children: 'beneath' }) })
  })
}

test('with nothing unsettled the band is only what is beneath', async ($, on) => {
  engine(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.findAll({ type: 'Text' })).map(t => t.text)).toEqual(['beneath'])
    await band.unmount()
  }
})
