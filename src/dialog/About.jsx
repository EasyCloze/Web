import { VER } from '../utility/env';
import Placeholder from '../widget/Placeholder';

export default function () {
  return (
    <>
      EasyCloze
      <Placeholder height='20px' />
      {VER}
      <Placeholder height='10px' />
      <a href="https://github.com/EasyCloze/Web" target='_blank'>View on Github</a>
    </>
  )
}
