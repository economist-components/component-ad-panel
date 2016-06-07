import React from 'react';
import ReactDom from 'react-dom';
import values from 'lodash.values';
function uniqueId() {
  const mathRandomToIntMultiplier = 1e17;
  const hex = 16;
  return (Math.random() * mathRandomToIntMultiplier).toString(hex);
}

let adPanelConfig = {};
const adDivs = [];
// NOTE: Refresh way - not working atm
// let adSlots = [];

function getOrCreateGoogleTag() {
  /* global window: false */
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    return null;
  }
  if (window.googletag) {
    return window.googletag;
  }
  window.googletag = { cmd: [] };
  const gads = document.createElement('script');
  gads.async = true;
  gads.type = 'text/javascript';
  const useSsl = window.location.protocol === 'https:';
  gads.src = `${ useSsl ? 'https:' : 'http:' }//www.googletagservices.com/tag/js/gpt.js`;
  window.document.head.appendChild(gads);
  return window.googletag;
}

function displayAdsFn(googleTag) {
  if (!adDivs.length) {
    return;
  }

  googleTag.enableServices();

  adDivs.forEach((div) => {
    googleTag.display(div);
  });

  // Clean up
  adDivs.length = 0;

  // Refresh way - Not working ATM
  // const pubAds = googleTag.pubads();
  // pubAds.refresh(adSlots);
}

/* global window: false */
/* global document: false */
export default class AdPanel extends React.Component {

  static get defaultProps() {
    return {
      animated: true,
      lazyLoad: true,
      lazyLoadMargin: 600,
      sizes: [
        { width: 60, height: 60 },
        { width: 70, height: 70 },
        { width: 300, height: 250 },
        { width: 1024, height: 768 },
      ],
      sizeMapping: [
        [
          { width: 980, height: 200 },
          [
            { width: 1024, height: 768 },
          ],
        ],
        [
          { width: 0, height: 0 },
          [
            { width: 300, height: 250 },
          ],
        ],
      ],
      targeting: [],
      styled: true,
    };
  }

  static config(options) {
    const googleTag = getOrCreateGoogleTag();
    adPanelConfig = options;

    googleTag.cmd.push(() => {
      const pubAds = googleTag.pubads();
      const targeting = adPanelConfig.targeting;
      // Set targeting
      pubAds.setTargeting('subs', targeting.subscriber);

      if (targeting.etear) {
        pubAds.setTargeting('etear', targeting.etear);
      }

      if (adPanelConfig.sra) {
        // enables Single Request Architecture (SRA)
        pubAds.enableSingleRequest();
      }

      // NOTE: Refresh way - not working atm
      // Disable initial load, we will use refresh() to fetch ads.
      // Calling this function means that display() calls just
      // register the slot as ready, but do not fetch ads for it.
      // pubAds.disableInitialLoad();

      // Collapses empty div elements on a page when there is no ad content to display.
      pubAds.collapseEmptyDivs();
    });
  }

  static displayAds() {
    const googleTag = getOrCreateGoogleTag();
    if (typeof googleTag.display === 'function') {
      displayAdsFn(googleTag);
    } else {
      googleTag.cmd.push(() => {
        displayAdsFn(googleTag);
      });
    }
  }

  constructor(...args) {
    super(...args);
    this.loadElementWhenInView = this.loadElementWhenInView.bind(this);
    this.unlistenSlotRenderEnded = () => null;
  }

  componentWillMount() {
    this.setState({
      tagId: `googlead-${ uniqueId() }`,
      adGenerated: false,
      adFailed: false,
    });
  }

  componentDidMount() {
    if (this.state && this.state.tagId) {
      this.getOrCreateGoogleTag();
    }
    if (!this.props.lazyLoad && this.state && this.state.tagId && !this.state.adGenerated) {
      this.generateAd();
    }
    window.addEventListener('scroll', this.loadElementWhenInView);
    window.addEventListener('resize', this.loadElementWhenInView);
    this.loadElementWhenInView();
  }

  componentWillUnmount() {
    this.cleanupEventListeners();
  }

  getOrCreateGoogleTag() {
    return getOrCreateGoogleTag();
  }

  isElementInViewport(elm, margin = 0) {
    const containerElement = this.getContainerDomElement();
    if (!containerElement || typeof containerElement.getBoundingClientRect !== 'function') {
      return false;
    }
    const rect = this.getContainerDomElement().getBoundingClientRect();
    return rect.bottom > -margin &&
      rect.right > -margin &&
      rect.left < (window.innerWidth || document.documentElement.clientWidth) + margin &&
      rect.top < (window.innerHeight || document.documentElement.clientHeight) + margin;
  }

  getContainerDomElement() {
    return ReactDom.findDOMNode(this.refs.container);
  }

  loadElementWhenInView() {
    const containerElement = this.refs.container;
    if (!this.state.adGenerated &&
        this.isElementInViewport(containerElement, this.props.lazyLoadMargin)) {
      this.generateAd();
    }
    if (this.isElementInViewport(containerElement) === true) {
      const targetContainerElement = this.getContainerDomElement();
      targetContainerElement.className += ' ad-panel--visible';
      this.cleanupEventListeners();
    }
  }

  cleanupEventListeners() {
    window.removeEventListener('scroll', this.loadElementWhenInView);
    window.removeEventListener('resize', this.loadElementWhenInView);
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
    const googleTag = this.getOrCreateGoogleTag();
    if (!googleTag.sizeMapping) {
      throw new Error('buildSizeMapping() must be called inside a googletag.cmd.push()\'ed function!');
    }
    const sizeMappingBuilder = googleTag.sizeMapping();
    return mapping.reduce((builder, [ viewportSize, adSizes ]) => (
      builder.addSize(values(viewportSize), adSizes.map(values))
    ), sizeMappingBuilder).build();
  }

  generateAd() {
    this.setState({ adGenerated: true });
    const googleTag = this.getOrCreateGoogleTag();
    googleTag.cmd.push(() => {
      const sizeMapping = this.buildSizeMapping();
      const { adTag, sizes } = this.props;
      const { tagId } = this.state;
      this.adSlot = googleTag.defineSlot(adTag, (sizes || []).map(values), tagId)
        .addService(googleTag.pubads())
        .defineSizeMapping(sizeMapping);
      for (const [ key, value ] of this.props.targeting) {
        this.adSlot.setTargeting(key, value);
      }
      const pubAds = googleTag.pubads();
      if (adPanelConfig.sra) {
        adDivs.push(tagId);
      } else {
        googleTag.enableServices();
        googleTag.display(tagId);
      }

      // Refresh way - NOT working atm
      // adSlots.push(this.adSlot);
      // googleTag.display(tagId);

      this.listenToSlotRenderEnded({ googleTag });
      if (this.props.onImpressionViewable) {
        pubAds.addEventListener('impressionViewable', this.props.onImpressionViewable);
      }
      if (this.props.onSlotVisibilityChanged) {
        pubAds.addEventListener('slotVisibilityChanged', this.props.onSlotVisibilityChanged);
      }
    });
  }

  render() {
    if (this.state && this.state.adFailed) {
      return (<div />);
    }
    let tag = [];
    if (this.state && this.state.tagId) {
      let adStyle = {};
      if (this.props.reserveHeight) {
        adStyle = { minHeight: this.props.reserveHeight };
      }
      tag = (
        <div
          className="ad-panel__googlead"
          id={this.state.tagId}
          style={adStyle}
          title="Advertisement"
        ></div>
      );
    }
    let rootClassNames = [ 'ad-panel__container' ];
    if (this.props.styled) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__container--styled' ]);
    }
    if (this.props.block) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__container--block' ]);
    }
    if (this.props.animated) {
      rootClassNames = rootClassNames.concat([ 'ad-panel__animated' ]);
    }
    if (this.props.className) {
      rootClassNames = rootClassNames.concat([ this.props.className ]);
    }
    const aria = {
      role: 'complementary',
      itemScope: 'https://schema.org/WPAdBlock',
    };
    return (
      <div ref="container" className={rootClassNames.join(' ')} {...aria}>
        {tag}
      </div>
    );
  }
}

if (process.env.NODE_ENV !== 'production') {
  const sizeObject = React.PropTypes.oneOf(
    React.PropTypes.arrayOf(React.PropTypes.number),
    React.PropTypes.shape({
      width: React.PropTypes.number,
      height: React.PropTypes.number,
    })
  );
  AdPanel.propTypes = {
    animated: React.PropTypes.bool,
    adTag: React.PropTypes.string.isRequired,
    className: React.PropTypes.string,
    lazyLoad: React.PropTypes.bool,
    lazyLoadMargin: React.PropTypes.number,
    sizes: React.PropTypes.arrayOf(sizeObject),
    sizeMapping: React.PropTypes.arrayOf(
      React.PropTypes.arrayOf(
        sizeObject
      )
    ),
    onFailure: React.PropTypes.func,
    targeting: React.PropTypes.arrayOf(React.PropTypes.arrayOf(sizeObject)),
    reserveHeight: React.PropTypes.number,
    styled: React.PropTypes.bool,
    block: React.PropTypes.bool,
    onSlotRenderEnded: React.PropTypes.func,
    onSlotVisibilityChanged: React.PropTypes.func,
    onImpressionViewable: React.PropTypes.func,
  };
}
