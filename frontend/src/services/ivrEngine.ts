// MANDIQ — IVR Dialog Tree & State Transition Engine (Sprint 8A)

import type { DTMFDigit, IVRMenuId, IVROption } from '../types/voice';

export interface MenuDefinition {
  id: IVRMenuId;
  title: string;
  hindiTitle: string;
  promptHindi: string;
  promptEnglish: string;
  options: IVROption[];
}

export const IVR_MENUS: Record<IVRMenuId, MenuDefinition> = {
  main: {
    id: 'main',
    title: 'MANDIQ IVR',
    hindiTitle: 'मुख्य मेन्यू',
    promptHindi:
      'Namaskar! Mandi-Q mein aapka swagat hai. Slot booking ke liye 1 dabaiye. Booking status ke liye 2 dabaiye. Voice booking ke liye 3 dabaiye. Dobara sunne ke liye 0 dabaiye. Call samapt karne ke liye hash dabaiye.',
    promptEnglish:
      'Welcome to Mandi-Q. Press 1 for Slot Booking, 2 for Status, 3 for AI Voice, 0 to repeat, # to end.',
    options: [
      { key: '1', label: '1: Slot Booking', hindiLabel: '1: स्लॉट बुकिंग', actionId: 'goto_crop_menu' },
      { key: '2', label: '2: Booking Status', hindiLabel: '2: बुकिंग स्थिति', actionId: 'check_status' },
      { key: '3', label: '3: Speak to AI', hindiLabel: '3: एआई से बात करें', actionId: 'speak_to_ai' },
      { key: '0', label: '0: Repeat Menu', hindiLabel: '0: दोबारा सुनें', actionId: 'repeat_menu' },
      { key: '#', label: '#: End Call', hindiLabel: '#: कॉल समाप्त करें', actionId: 'end_call' },
    ],
  },
  crop_select: {
    id: 'crop_select',
    title: 'FASAL CHUNIYE',
    hindiTitle: 'फसल चुनें',
    promptHindi:
      'Fasal chuniye: 1 Gehu (Wheat), 2 Dhaan (Paddy), 3 Jowar, 4 Makka (Maize). Wapas jane ke liye 0 dabaiye.',
    promptEnglish:
      'Choose crop: 1 Wheat, 2 Paddy, 3 Jowar, 4 Maize. Press 0 for Main Menu.',
    options: [
      { key: '1', label: '1: Gehu (Wheat)', hindiLabel: '1: गेहूँ', actionId: 'crop_wheat' },
      { key: '2', label: '2: Dhaan (Paddy)', hindiLabel: '2: धान', actionId: 'crop_paddy' },
      { key: '3', label: '3: Jowar', hindiLabel: '3: ज्वार', actionId: 'crop_jowar' },
      { key: '4', label: '4: Makka (Maize)', hindiLabel: '4: मक्का', actionId: 'crop_maize' },
      { key: '0', label: '0: Back to Menu', hindiLabel: '0: वापस जाएँ', actionId: 'goto_main_menu' },
    ],
  },
  status_check: {
    id: 'status_check',
    title: 'STATUS CHECK',
    hindiTitle: 'स्थिति जांच',
    promptHindi: 'Aapki booking status jaanch ki ja rahi hai...',
    promptEnglish: 'Checking your live booking status from APMC gate ledger...',
    options: [
      { key: '1', label: '1: Slot Booking', hindiLabel: '1: स्लॉट बुकिंग', actionId: 'goto_crop_menu' },
      { key: '0', label: '0: Main Menu', hindiLabel: '0: मुख्य मेन्यू', actionId: 'goto_main_menu' },
      { key: '#', label: '#: End Call', hindiLabel: '#: कॉल समाप्त करें', actionId: 'end_call' },
    ],
  },
  ai_speak: {
    id: 'ai_speak',
    title: 'AI VOICE ASSISTANT',
    hindiTitle: 'एआई वॉयस सहायक',
    promptHindi:
      'Namaskar! Aap kis fasal aur kis din ke liye slot book karna chahte hain? Kripya bolkar batayein.',
    promptEnglish:
      'Hello! Which crop and date would you like to book for? Please speak now.',
    options: [
      { key: '1', label: '1: Gehu Book Karein', hindiLabel: '1: गेहूँ बुक करें', actionId: 'crop_wheat' },
      { key: '0', label: '0: Main Menu', hindiLabel: '0: मुख्य मेन्यू', actionId: 'goto_main_menu' },
      { key: '#', label: '#: End Call', hindiLabel: '#: कॉल समाप्त करें', actionId: 'end_call' },
    ],
  },
  error: {
    id: 'error',
    title: 'KRIPYA DHYAN DEIN',
    hindiTitle: 'कृपया ध्यान दें',
    promptHindi: 'Kripya dobara prayas kijiye.',
    promptEnglish: 'Please try again.',
    options: [
      { key: '0', label: '0: Main Menu', hindiLabel: '0: मुख्य मेन्यू', actionId: 'goto_main_menu' },
      { key: '#', label: '#: End Call', hindiLabel: '#: कॉल समाप्त करें', actionId: 'end_call' },
    ],
  },
};

export class IVREngine {
  private currentMenuId: IVRMenuId = 'main';
  private cursorIndex: number = 0;

  public getMenu(menuId: IVRMenuId = this.currentMenuId): MenuDefinition {
    return IVR_MENUS[menuId] || IVR_MENUS.main;
  }

  public getCurrentMenu(): MenuDefinition {
    return this.getMenu(this.currentMenuId);
  }

  public setMenu(menuId: IVRMenuId): MenuDefinition {
    this.currentMenuId = menuId;
    this.cursorIndex = 0;
    return this.getCurrentMenu();
  }

  public getCursorIndex(): number {
    return this.cursorIndex;
  }

  public moveCursor(direction: 'UP' | 'DOWN'): number {
    const menu = this.getCurrentMenu();
    const count = menu.options.length;
    if (count === 0) return 0;

    if (direction === 'UP') {
      this.cursorIndex = (this.cursorIndex - 1 + count) % count;
    } else {
      this.cursorIndex = (this.cursorIndex + 1) % count;
    }
    return this.cursorIndex;
  }

  public getSelectedOption(): IVROption | undefined {
    const menu = this.getCurrentMenu();
    return menu.options[this.cursorIndex];
  }

  public resolveDTMF(digit: DTMFDigit): IVROption | undefined {
    const menu = this.getCurrentMenu();
    return menu.options.find((opt) => opt.key === digit);
  }

  public getErrorPrompt(): { hindi: string; english: string } {
    return {
      hindi: 'Kripya dobara prayas kijiye.',
      english: 'Please try again.',
    };
  }

  public reset(): void {
    this.currentMenuId = 'main';
    this.cursorIndex = 0;
  }
}

export const ivrEngine = new IVREngine();
