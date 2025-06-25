import { createTimestamp } from '../../utilities/dateutils';
import getJSONUpload from '../../utilities/getJsonUpload';
import { getClosest, setTheme } from '../../utilities/helpers';
import storage from '../../utilities/storage';
import handleShortCutsModal from './shortcutsModal';

const sidebarSubMenuOverlay = document.querySelector('.sidebar-sub-menu__overlay');
const sidebarSubMenu = document.querySelector('.sidebar-sub-menu');
const appBody = document.querySelector('.body');
const themeRadioBtns = document.querySelectorAll('.theme-radio__input');
const shortcutSwitch = document.querySelector('.smia-toggle-shortcuts-checkbox');
const animationsSwitchBtn = document.querySelector('.smdt-toggle-checkbox');
const notifyDisabledShortcutsIcon = document.querySelector('.keyboard-disabled-sm');

export default function getSidebarSubMenu(store, context) {
  const themeRadioOptions = ['dark', 'light', 'contrast'];
  const closemenu = 'hide-sidebar-sub-menu';

  function closeSubOnEscape(e) {
    const popup = document.querySelector('.sb-sub-popup-confirm');
    if (e.key === 'Escape') {
      if (popup) {
        popup.remove();
        sidebarSubMenuOverlay?.classList.remove('sub-overlay-vis');
      } else {
        closeSubMenu();
        sidebarSubMenuOverlay?.classList.remove('sub-overlay-vis');
      }
    } else if (e.key.toLowerCase() === 'a' && !popup) {
      closeSubMenu();
    }
  }

  function createUploadConfirmationPopup() {
    const popup = document.createElement('div');
    popup.classList.add('sb-sub-popup-confirm');
    const [totalEntries, totalCategories] = store.getStoreStats();
    let [hasEntries, hasCategories] = [false, false];
    let titleEntries;

    if (totalEntries > 0) hasEntries = `Overwriting ${totalEntries} entries`;
    if (totalCategories > 1) {
      hasCategories = totalCategories === 2 ? '1 category.' : `${totalCategories - 1} categories.`;
    }

    titleEntries = hasEntries && hasCategories
      ? `${hasEntries} and ${hasCategories}`
      : hasEntries || hasCategories || 'Current calendar has no entries or categories.';

    const subtitle = document.createElement('div');
    subtitle.classList.add('sb-sub-popup-subtitle');
    subtitle.textContent = titleEntries;

    const subtitle2 = document.createElement('div');
    subtitle2.classList.add('sb-sub-popup-subtitle');
    subtitle2.textContent = 'This action is irreversible.';

    const subtitle3 = document.createElement('div');
    subtitle3.classList.add('sb-sub-popup-title');
    subtitle3.textContent =
      'Please ensure you have a valid backup before proceeding. Use the "validate .json" button next to "upload .json" to check that everything is in order.';

    const btns = document.createElement('div');
    btns.classList.add('sb-sub-popup-btns');

    const cancelBtn = document.createElement('button');
    cancelBtn.classList.add('sb-sub-popup-btn--cancel');
    cancelBtn.textContent = 'Cancel';

    const proceedBtn = document.createElement('button');
    proceedBtn.classList.add('sb-sub-popup-btn--proceed');
    proceedBtn.textContent = 'Proceed';

    btns.append(cancelBtn, proceedBtn);
    popup.append(subtitle, subtitle2, subtitle3, btns);

    return popup;
  }

  function closeSubMenu() {
    const popup = document.querySelector('.sb-sub-popup-confirm');
    if (popup) {
      popup.remove();
      sidebarSubMenuOverlay?.classList.remove('sub-overlay-vis');
    } else {
      store.removeActiveOverlay(closemenu);
      sidebarSubMenu?.classList.add(closemenu);
      sidebarSubMenuOverlay?.classList.add(closemenu);
      document.removeEventListener('keydown', closeSubOnEscape);
      sidebarSubMenuOverlay.onclick = null;
    }
  }

  function setStatusIcon(status) {
    if (!notifyDisabledShortcutsIcon) return;
    notifyDisabledShortcutsIcon.setAttribute(
      'data-tooltip',
      status ? 'Keyboard shortcuts enabled' : 'Keyboard shortcuts disabled',
    );
    notifyDisabledShortcutsIcon.firstElementChild?.setAttribute(
      'fill',
      status ? 'var(--primary1)' : 'var(--red1)',
    );
  }

  function openSubMenu() {
    const themeIdx = themeRadioOptions.indexOf(context.getColorScheme());
    if (themeRadioBtns[themeIdx]) themeRadioBtns[themeIdx].checked = true;

    const shortcutStatus = store.getShortcutsStatus();
    setStatusIcon(shortcutStatus);
    if (shortcutSwitch) shortcutSwitch.checked = shortcutStatus;

    const animationStatus = store.getAnimationStatus();
    setAnimationsIcons(animationStatus);
    if (animationsSwitchBtn) animationsSwitchBtn.checked = animationStatus;

    store.addActiveOverlay(closemenu);
    sidebarSubMenu?.classList.remove(closemenu);
    sidebarSubMenuOverlay?.classList.remove(closemenu);
    document.addEventListener('keydown', closeSubOnEscape);
    sidebarSubMenuOverlay.onclick = closeSubMenu;
  }

  function getJSONDownload() {
    const json = JSON.stringify(storage.getAllData(), null, 2);
    const [totalEntries, totalCategories] = store.getStoreStats();
    const filename = `ENT_${totalEntries}_CAT_${totalCategories}_${createTimestamp()}`;
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${filename}.json`;
    document.body.append(link);
    link.click();
    URL.revokeObjectURL(href);
    link.remove();
  }

  function removePopup() {
    sidebarSubMenuOverlay?.classList.remove('sub-overlay-vis');
    document.querySelector('.sb-sub-popup-confirm')?.remove();
  }

  function handleCalendarJSON(action) {
    if (action === 'download') {
      getJSONDownload();
    } else {
      const popup = createUploadConfirmationPopup();
      document.body.append(popup);
      sidebarSubMenuOverlay?.classList.add('sub-overlay-vis');
      const cancelBtn = popup.querySelector('.sb-sub-popup-btn--cancel');
      const proceedBtn = popup.querySelector('.sb-sub-popup-btn--proceed');
      cancelBtn.onclick = removePopup;
      proceedBtn.onclick = () => {
        getJSONUpload(store, closeSubMenu)
          .then((json) => console.log('JSON upload successful:', json))
          .catch((error) => console.error('JSON upload failed:', error));
      };
    }
  }

  function handleThemeChange(e) {
    const input = e.target?.closest('.theme-option')?.querySelector('input');
    if (!input) return;
    input.checked = true;
    if (input.value !== context.getColorScheme()) {
      context.setColorScheme(input.value);
      setTheme(context, store);
    }
  }

  function openKbShortcutMenu() {
    closeSubMenu();
    handleShortCutsModal(store);
  }

  function toggleShortcuts() {
    if (!shortcutSwitch) return;
    const status = shortcutSwitch.checked === false;
    store.setShortcutsStatus(status);
    setStatusIcon(status);
  }

  function toggleShortcutsIcon() {
    let status = store.getShortcutsStatus();
    status = !status;
    store.setShortcutsStatus(status);
    setStatusIcon(status);
    if (shortcutSwitch) shortcutSwitch.checked = status;
  }

  function setAnimationsIcons(val) {
    const parent = document.querySelector('.toggle-animations-icon__sm');
    const icons = {
      on: document.querySelector('.tai-on'),
      off: document.querySelector('.tai-off'),
    };
    if (!parent || !icons.on || !icons.off) return;
    if (val) {
      icons.on.classList.remove('hide-tai');
      icons.off.classList.add('hide-tai');
      parent.setAttribute('data-tooltip', 'Animations Enabled');
    } else {
      icons.on.classList.add('hide-tai');
      icons.off.classList.remove('hide-tai');
      parent.setAttribute('data-tooltip', 'Animations Disabled');
    }
  }

  function toggleAnimations(fromIcon) {
    const status = animationsSwitchBtn?.checked === false;
    store.setAnimationStatus(status);
    setAnimationsIcons(status);
    if (fromIcon && animationsSwitchBtn) {
      animationsSwitchBtn.checked = status;
    }
    appBody?.setAttribute('data-disable-transitions', !status);
  }

  function delegateSubMenuEvents(e) {
    const download = getClosest(e, '.down-json');
    const upload = getClosest(e, '.upload-json');
    const theme = getClosest(e, '.theme-option');
    const kbMenu = getClosest(e, '.toggle-kb-shortcuts-btn__smia');
    const shortcutBtn = getClosest(e, '.smia-disable-shortcuts__btn');
    const shortcutIcon = getClosest(e, '.keyboard-disabled-sm');
    const animationsSwitch = getClosest(e, '.smdt-toggle');
    const animationsIcon = getClosest(e, '.toggle-animations-icon__sm');
    const closeBtn = getClosest(e, '.close-sub-menu');

    if (download) return handleCalendarJSON('download');
    if (upload) return handleCalendarJSON('upload');
    if (theme) return handleThemeChange(e);
    if (kbMenu) return openKbShortcutMenu();
    if (shortcutBtn) return toggleShortcuts();
    if (shortcutIcon) return toggleShortcutsIcon();
    if (animationsSwitch) return toggleAnimations();
    if (animationsIcon) return toggleAnimations(true);
    if (closeBtn) return closeSubMenu();

    return null; // added to satisfy `consistent-return`
  }

  function setSidebarSubMenu() {
    openSubMenu();
    if (sidebarSubMenu) {
      sidebarSubMenu.onmousedown = delegateSubMenuEvents;
    }
  }

  setSidebarSubMenu();
}
