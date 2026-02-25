
export class Pix {
    private merchantName: string;
    private merchantCity: string;
    private pixKey: string;
    private amount?: string;
    private txId: string;

    constructor(
        merchantName: string,
        merchantCity: string,
        pixKey: string,
        amount?: number,
        txId: string = '***'
    ) {
        this.merchantName = this.normalizeString(merchantName).substring(0, 25);
        this.merchantCity = this.normalizeString(merchantCity).substring(0, 15);
        this.pixKey = pixKey;
        this.amount = amount ? amount.toFixed(2) : undefined;
        this.txId = txId;
    }

    private normalizeString(str: string): string {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .toUpperCase();
    }

    private formatField(id: string, value: string): string {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    }

    private getCRC16(payload: string): string {
        payload += '6304';
        let crc = 0xffff;
        const polynomial = 0x1021;

        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) {
                    crc = (crc << 1) ^ polynomial;
                } else {
                    crc = crc << 1;
                }
            }
        }

        return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
    }

    public getPayload(): string {
        const payloadKey = [
            this.formatField('00', 'BR.GOV.BCB.PIX'),
            this.formatField('01', this.pixKey),
        ].join('');

        const lines = [
            this.formatField('00', '01'), // Payload Format Indicator
            this.formatField('26', payloadKey), // Merchant Account Information
            this.formatField('52', '0000'), // Merchant Category Code
            this.formatField('53', '986'), // Transaction Currency
            this.amount ? this.formatField('54', this.amount) : '', // Transaction Amount
            this.formatField('58', 'BR'), // Country Code
            this.formatField('59', this.merchantName), // Merchant Name
            this.formatField('60', this.merchantCity), // Merchant City
            this.formatField('62', this.formatField('05', this.txId)), // Additional Data Field Template
        ];

        const payload = lines.join('');
        const crc = this.getCRC16(payload);

        return `${payload}6304${crc}`;
    }
}
