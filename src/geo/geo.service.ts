import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Extrait le centroïde depuis Field.areaCoordinates
   * Format attendu : [[lat1,lng1],[lat2,lng2],...] ou {type:"Polygon",coordinates:[...]}
   */
  extractCentroid(areaCoordinates: any): { lat: number; lng: number } | null {
    try {
      let coords: number[][] = [];
      if (Array.isArray(areaCoordinates)) {
        coords = areaCoordinates;
      } else if (areaCoordinates?.coordinates) {
        // GeoJSON Polygon : coordinates[0] = ring extérieur
        coords = areaCoordinates.coordinates[0];
      }
      if (!coords.length) return null;
      const lat =
        coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
      const lng =
        coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
      return { lat, lng };
    } catch {
      return null;
    }
  }

  /**
   * Reverse geocoding via OpenStreetMap Nominatim (gratuit, sans clé API)
   * Retourne le code ISO 3166-1 alpha-2 du pays
   */
  async resolveCountryCode(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=5`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PastureAI/3.0 (contact@pastureai.com)' },
      });
      const data = await res.json();
      return data?.address?.country_code?.toUpperCase() ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Résolution complète : coordonnées → countryCode → Country en base
   * Met à jour Field.countryCode + Field.countryId si non défini
   */
  async resolveAndCacheFieldCountry(fieldId: string): Promise<string | null> {
    const field = await this.prisma.field.findUnique({
      where: { id: fieldId },
    });
    if (!field) return null;

    // Déjà résolu → on retourne depuis le cache
    if (field.countryCode) return field.countryCode;

    const centroid = this.extractCentroid(field.areaCoordinates);
    if (!centroid) return null;

    const code = await this.resolveCountryCode(centroid.lat, centroid.lng);
    if (!code) return null;

    const country = await this.prisma.country.findUnique({ where: { code } });

    await this.prisma.field.update({
      where: { id: fieldId },
      data: {
        countryCode: code,
        fmdFreeZone:
          country != null
            ? country.fmdZoneStatus === 'FREE_WITHOUT_VAX'
            : false,
        ...(country ? { countryId: country.id } : {}),
      },
    });

    return code;
  }

  /**
   * Suggest currency based on country code
   */
  suggestCurrency(countryCode: string): string {
    const currencyMap: { [key: string]: string } = {
      TN: 'TND',
      MA: 'MAD',
      DZ: 'DZD', // Maghreb
      FR: 'EUR',
      BE: 'EUR',
      DE: 'EUR',
      IT: 'EUR',
      ES: 'EUR',
      NL: 'EUR',
      LU: 'EUR',
      AT: 'EUR',
      PT: 'EUR',
      FI: 'EUR',
      IE: 'EUR',
      GR: 'EUR',
      SI: 'EUR',
      MT: 'EUR',
      CY: 'EUR',
      SK: 'EUR',
      EE: 'EUR',
      LV: 'EUR',
      LT: 'EUR', // Europe EUR
      GB: 'GBP',
      CH: 'CHF', // Europe others
      US: 'USD',
      CA: 'CAD',
      BR: 'BRL',
      AR: 'ARS', // Americas
      AU: 'AUD',
      IN: 'INR',
      CN: 'CNY',
      TR: 'TRY', // Asia-Pacific & Middle East
    };
    return currencyMap[countryCode] || 'USD';
  }
}
