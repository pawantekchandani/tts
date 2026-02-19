/**
 * specific properties to copy for the mirror div
 */
const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
];

/**
 * Calculate the coordinates of the caret or selection end
 * @param {HTMLTextAreaElement} element 
 * @param {number} position 
 */
export function getCaretCoordinates(element, position) {
    const isFirefox = window.mozInnerScreenX != null; // lightweight check

    const div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    const style = div.style;
    const computed = window.getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    if (element.nodeName !== 'INPUT')
        style.wordWrap = 'break-word';  // only for textarea-s

    // Position off-screen
    style.position = 'absolute';
    style.visibility = 'hidden';

    // Transfer the element's properties to the div
    properties.forEach(prop => {
        style[prop] = computed[prop];
    });

    if (isFirefox) {
        // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
        if (element.scrollHeight > parseInt(computed.height))
            style.overflowY = 'scroll';
    } else {
        style.overflow = 'hidden';  // for Chrome to not render a scrollbar; might want overflowY = 'auto' instead?
    }

    div.textContent = element.value.substring(0, position);

    // The second special handling for strings ending in spaces
    if (element.nodeName === 'INPUT')
        div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';  // Hack
    div.appendChild(span);

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']),
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        height: parseInt(computed['lineHeight'])
    };

    document.body.removeChild(div);

    return coordinates;
}

/**
 * Get the absolute (viewport-relative) coordinates of the selection end
 * to position the floating menu.
 */
export function getSelectionCoords(textarea) {
    if (!textarea) return null;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart === selectionEnd) return null; // No selection

    // We want the coordinates of the END of the selection, or the middle?
    // Usually middle of the selection is best, but hard to calculate with mirror div.
    // Getting the end of selection is easiest.

    // Calculate coordinates relative to the textarea
    const coords = getCaretCoordinates(textarea, selectionEnd);

    // Get textarea's position relative to viewport
    const rect = textarea.getBoundingClientRect();

    // Account for scrolling
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    return {
        top: rect.top + coords.top - scrollTop + window.scrollY,
        left: rect.left + coords.left - scrollLeft + window.scrollX
    };
}
