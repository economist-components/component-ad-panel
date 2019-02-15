/* global window: false */
/* global document: false */
import React from 'react';
import PropTypes from 'prop-types';

function heightWidthPair(hwPair) {
  if (Array.isArray(hwPair) && hwPair.length === 0) {
    return hwPair;
  }
  if (
    typeof hwPair.width === 'number' &&
    typeof hwPair.height === 'number'
  ) {
    return [ hwPair.width, hwPair.height ];
  }
  if (
    typeof hwPair[0] === 'number' &&
    typeof hwPair[1] === 'number'
  ) {
    return hwPair;
  }
  throw new Error(`AdPanel: Invalid height/width pair ${ JSON.stringify(hwPair) }`);
}

function uniqueId() {
  const mathRandomToIntMultiplier = 1e17;
  const hex = 16;
  return (Math.random() * mathRandomToIntMultiplier).toString(hex);
}

let adPanelConfig = {};
const adDivs = [];
function displayAdsFn(googleTag) {
  if (!adDivs.length) {
    return;
  }
  googleTag.enableServices();
  adDivs.forEach((div) => {
    googleTag.display(div.id);
  });

  if (adPanelConfig.sra) {
    // since we disabled initial load (see https://support.google.com/dfp_premium/answer/4578089?hl=en on
    // 'pages with infinite content'), when we update the slots we need to invoke a refresh on them to actually
    // fetch the ads (display() in this case only register the slot as ready without fetching anything)
    googleTag.pubads().refresh(adDivs.map((slotInfo) => (slotInfo.slot)));
  }
  // Clean up
  adDivs.length = 0;
}

export default class AdPanel extends React.Component {
  static get defaultProps() {
    return {
      sizes: [],
      sizeMapping: [],
      targeting: [],
      styled: true,
    };
  }

  static config(options) {
    const googleTag = AdPanel.getOrCreateGoogleTag();
    adPanelConfig = options;

    googleTag.cmd.push(() => {
      const pubAds = googleTag.pubads();
      const targeting = adPanelConfig.targeting;
      // Set targeting

      for (const targetingKey in targeting) {
        if (targeting.hasOwnProperty(targetingKey)) {
          pubAds.setTargeting(targetingKey, targeting[targetingKey]);
        }
      }

      if (adPanelConfig.sra) {
        // enables Single Request Architecture (SRA)
        // SRA would require all slots to be defined before calling enableServices().
        // To implement incremental loading (like when using the 'Load More' button) we need to
        // disable the initial load and use refresh() to actually fetch them instead
        // (see https://support.google.com/dfp_premium/answer/4578089?hl=en on 'pages with infinite content')
        pubAds.disableInitialLoad();
        pubAds.enableSingleRequest();
      }

      // Collapses empty div elements on a page when there is no ad content to display.
      pubAds.collapseEmptyDivs();
    });
  }

  static displayAds() {
    const googleTag = AdPanel.getOrCreateGoogleTag();
    if (typeof googleTag.display === 'function') {
      displayAdsFn(googleTag);
    } else {
      googleTag.cmd.push(() => {
        displayAdsFn(googleTag);
      });
    }
  }

  static getOrCreateGoogleTag() {
    /* global window: false */
    if (typeof window === 'undefined' || typeof window.document === 'undefined') {
      return null;
    }
    window.gptScriptInserted = window.gptScriptInserted || false;
    window.googletag = window.googletag || {};
    const googletag = window.googletag;
    if (googletag.apiReady || window.gptScriptInserted) {
      return googletag;
    }
    googletag.cmd = googletag.cmd || [];
    const gads = document.createElement('script');
    gads.async = true;
    gads.type = 'text/javascript';
    const useSsl = window.location.protocol === 'https:';
    gads.src = `${ useSsl ? 'https:' : 'http:' }//www.googletagservices.com/tag/js/gpt.js`;
    window.document.head.appendChild(gads);
    window.gptScriptInserted = true;
    return window.googletag;
  }

  constructor(...args) {
    super(...args);
    this.unlistenSlotRenderEnded = () => null;
  }

  componentDidMount() {
    this.generateAd();
  }

  componentWillUpdate(nextProps) {
    if (this.adSlot) {
      /* eslint-disable arrow-body-style */
      const didChange = (prop) => {
        return (
          (prop in this.props) &&
          (prop in nextProps) &&
          JSON.stringify(this.props[prop]) !== JSON.stringify(nextProps[prop])
        );
      };
      /* eslint-enable arrow-body-style */
      const didAnyAdRelatedPropChange =
        didChange('adTag') ||
        didChange('targeting') ||
        didChange('sizes') ||
        didChange('sizeMapping');
      if (didAnyAdRelatedPropChange) {
        const googleTag = AdPanel.getOrCreateGoogleTag();
        this.destroySlot();
        this.defineSlot(googleTag);
      }
    }
  }

  componentWillUnmount() {
    this.cleanupEventListeners();
    this.destroySlot();
  }

  destroySlot() {
    // This is always synchronous.
    if (typeof window.googletag !== 'undefined' && this.adSlot) {
      window.googletag.destroySlots([ this.adSlot ]);
    }
    this.adSlot = null;
    // remove this slot from the adDivs
    const idxToRemove = adDivs.findIndex((slot) => (slot.id));
    if (idxToRemove >= 0) {
      adDivs.splice(idxToRemove, 1);
    }
  }

  cleanupEventListeners() {
    this.unlistenSlotRenderEnded();
  }

  listenToSlotRenderEnded({ googleTag }) {
    if (!googleTag.pubads) {
      throw new Error('listenToSlotRenderEnded() must be called inside a googletag.cmd.push()\'ed function!');
    }
    if (!this.adSlot) {
      throw new Error('listenToSlotRenderEnded() must be called with this.adSlot available!');
    }

    const slot = this.adSlot;
    // the GPT API doesn't have a removeEventListener function
    let stopListening = false;
    googleTag.pubads().addEventListener('slotRenderEnded', (slotRenderEndedEvent) => {
      if (stopListening || slotRenderEndedEvent.slot !== slot) {
        return;
      }
      if (this.props.onSlotRenderEnded) {
        this.props.onSlotRenderEnded(slotRenderEndedEvent);
      }
      if (slotRenderEndedEvent.isEmpty) {
        this.setState({ adFailed: true });
        this.cleanupEventListeners();
        if (this.props.onFailure) {
          this.props.onFailure();
        }
        return;
      }
      this.unlistenSlotRenderEnded();
    });
    this.unlistenSlotRenderEnded = () => {
      stopListening = true;
      return null;
    };
  }

  buildSizeMapping() {
    const mapping = this.props.sizeMapping || [];
    const googleTag = AdPanel.getOrCreateGoogleTag();
    if (!googleTag.sizeMapping) {
      throw new Error('buildSizeMapping() must be called inside a googletag.cmd.push()\'ed function!');
    }
    const sizeMappingBuilder = googleTag.sizeMapping();
    return mapping.reduce((builder, [ viewportSize, adSizes ]) => (
      builder.addSize(heightWidthPair(viewportSize), adSizes.map(heightWidthPair))
    ), sizeMappingBuilder).build();
  }

  generateAd() {
    const googleTag = AdPanel.getOrCreateGoogleTag();
    if (typeof this.props.adTag === 'undefined') {
      return;
    }
    googleTag.cmd.push(() => {
      try {
        this.defineSlot(googleTag);
      } catch (errorFromDefineSlot) {
        // Google catches this and hides it from us
        if (typeof console !== 'undefined') {
          /* eslint-disable no-console */
          console.error(errorFromDefineSlot);
          /* eslint-enable no-console */
        }
      }
    });
  }

  defineSlot(googleTag) {
    this.setState({
      tagId: `googlead-${ uniqueId() }`,
      adFailed: false,
    }, () => {
      this.onTagIDUpdated(googleTag);
    });
  }

  onTagIDUpdated(googleTag) {
    const sizeMapping = this.buildSizeMapping();
    const { adTag, sizes } = this.props;
    const { tagId } = this.state;
    this.adSlot = googleTag.defineSlot(adTag, (sizes || []).map(heightWidthPair), tagId)
      .addService(googleTag.pubads())
      .defineSizeMapping(sizeMapping);
    for (const [ key, value ] of this.props.targeting) {
      this.adSlot.setTargeting(key, value);
    }
    const pubAds = googleTag.pubads();
    if (adPanelConfig.sra) {
      adDivs.push({ id: tagId, slot: this.adSlot });
      if (typeof this.props.onSlotDefined === 'function') {
        this.props.onSlotDefined(tagId);
      }
    } else {
      googleTag.enableServices();
      googleTag.display(tagId);
    }

    this.listenToSlotRenderEnded({ googleTag });
    if (this.props.onImpressionViewable) {
      pubAds.addEventListener('impressionViewable', this.props.onImpressionViewable);
    }
    if (this.props.onSlotVisibilityChanged) {
      pubAds.addEventListener('slotVisibilityChanged', this.props.onSlotVisibilityChanged);
    }
  }

  render() {
    if (this.state && this.state.adFailed) {
      return (<div />);
    }
    let adStyle = {};
    if (this.props.reserveHeight) {
      adStyle = { minHeight: this.props.reserveHeight };
    }
    const tag = (
      <div
        className="ad-panel__googlead"
        id={this.state && this.state.tagId}
        style={adStyle}
        title="Advertisement"
      ></div>
    );
    let rootClassNames = [ 'ad-panel__container' ];
    if (this.props.styled) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__container--styled' ]);
    }
    if (this.props.block) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__container--block' ]);
    }
    if (this.props.className) {
      rootClassNames = rootClassNames.concat([ this.props.className ]);
    }
    const props = {
      className: rootClassNames.join(' '),
    };
    const aria = {
      'aria-label': 'Advertisement',
      role: 'complementary',
      itemScope: 'https://schema.org/WPAdBlock',
    };
    if (this.props.inlineStyle) {
      props.style = this.props.inlineStyle;
    }
    return (
      <div {...props} {...aria}>
        {tag}
      </div>
    );
  }
}

if (process.env.NODE_ENV !== 'production') {
  /* eslint-disable id-blacklist */
  const { string, arrayOf, oneOfType, shape, number, func, bool } = PropTypes;
  const sizeObject = oneOfType([
    string,
    arrayOf(number),
    shape({
      width: number,
      height: number,
    }),
  ]);
  AdPanel.propTypes = {
    adTag: string.isRequired,
    className: string,
    sizes: arrayOf(sizeObject),
    sizeMapping: arrayOf(
      arrayOf(
        oneOfType([
          sizeObject,
          arrayOf(sizeObject),
        ])
      )
    ),
    onFailure: func,
    onSlotDefined: func,
    targeting: arrayOf(arrayOf(sizeObject)),
    reserveHeight: number,
    styled: bool,
    inlineStyle: shape({
      height: string,
    }),
    block: bool,
    onSlotRenderEnded: func,
    onSlotVisibilityChanged: func,
    onImpressionViewable: func,
  };
  /* eslint-enable id-blacklist */
}
