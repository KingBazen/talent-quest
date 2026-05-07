/**
 * Twelve most-trusted Ethiopian banks accepted for the offline bank-transfer
 * payment method. The `name` is shown to contestants in the bank-transfer
 * tab of the PaymentModal; the `code` is what we persist on `payments.bank_name`.
 *
 * Account numbers are intentionally not stored here — the operator should
 * keep the live deposit account on the merchant ops dashboard so it can be
 * rotated without a code deploy. The modal renders a placeholder block the
 * operator fills in.
 */
export interface EthiopianBank {
  code: string;
  name: string;
  shortName: string;
}

export const ETHIOPIAN_BANKS: ReadonlyArray<EthiopianBank> = [
  { code: "CBE", name: "Commercial Bank of Ethiopia", shortName: "CBE" },
  { code: "AWASH", name: "Awash Bank", shortName: "Awash" },
  { code: "DASHEN", name: "Dashen Bank", shortName: "Dashen" },
  { code: "BOA", name: "Bank of Abyssinia", shortName: "BoA" },
  { code: "HIBRET", name: "Hibret Bank (United Bank)", shortName: "Hibret" },
  { code: "WEGAGEN", name: "Wegagen Bank", shortName: "Wegagen" },
  { code: "NIB", name: "Nib International Bank", shortName: "NIB" },
  { code: "COOP", name: "Cooperative Bank of Oromia", shortName: "CoopBank" },
  { code: "ZEMEN", name: "Zemen Bank", shortName: "Zemen" },
  { code: "BUNNA", name: "Bunna Bank", shortName: "Bunna" },
  { code: "ABAY", name: "Abay Bank", shortName: "Abay" },
  { code: "BERHAN", name: "Berhan Bank", shortName: "Berhan" },
];

export const ETHIOPIAN_BANK_CODES = ETHIOPIAN_BANKS.map((b) => b.code) as ReadonlyArray<string>;

export function bankByCode(code: string): EthiopianBank | undefined {
  return ETHIOPIAN_BANKS.find((b) => b.code === code);
}
