import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReverseGeocodeResult {
    countryCode: string | null;
    regionName: string | null;
}

interface ResolvedFieldLocation {
    countryCode: string | null;
    regionCode: string | null;
    countryId: string | null;
    regionId: string | null;
}

@Injectable()
export class GeoService {
    constructor(private prisma: PrismaService) { }

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
            const lat = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
            const lng = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
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

    private normalizeRegionToken(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toUpperCase();
    }

    private extractRegionName(address: any): string | null {
        const raw =
            address?.state ??
            address?.region ??
            address?.state_district ??
            address?.province ??
            address?.county ??
            address?.city ??
            address?.town ??
            null;

        if (!raw || typeof raw !== 'string') {
            return null;
        }

        const cleaned = raw.trim();
        return cleaned.length ? cleaned : null;
    }

    async reverseGeocodeLocation(lat: number, lng: number): Promise<ReverseGeocodeResult> {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'PastureAI/3.0 (contact@pastureai.com)' },
            });

            if (!res.ok) {
                return { countryCode: null, regionName: null };
            }

            const data = await res.json();
            return {
                countryCode: data?.address?.country_code?.toUpperCase() ?? null,
                regionName: this.extractRegionName(data?.address),
            };
        } catch {
            return { countryCode: null, regionName: null };
        }
    }

    private async findMatchingFieldRegion(
        countryId: string,
        regionName: string,
    ): Promise<{ id: string; code: string; name: string } | null> {
        const regions = await this.prisma.fieldRegion.findMany({
            where: { countryId },
            select: {
                id: true,
                code: true,
                name: true,
            },
        });

        if (!regions.length) {
            return null;
        }

        const normalizedInput = this.normalizeRegionToken(regionName);

        const exact = regions.find((region) => {
            return (
                this.normalizeRegionToken(region.code) === normalizedInput ||
                this.normalizeRegionToken(region.name) === normalizedInput
            );
        });

        if (exact) {
            return exact;
        }

        return (
            regions.find((region) => {
                const normalizedName = this.normalizeRegionToken(region.name);
                return (
                    normalizedInput.includes(normalizedName) ||
                    normalizedName.includes(normalizedInput)
                );
            }) ?? null
        );
    }

    async resolveAndCacheFieldLocation(
        fieldId: string,
        options?: { forceRefresh?: boolean },
    ): Promise<ResolvedFieldLocation | null> {
        const field = await this.prisma.field.findUnique({
            where: { id: fieldId },
            select: {
                id: true,
                areaCoordinates: true,
                countryCode: true,
                regionCode: true,
                countryId: true,
                regionId: true,
            },
        });

        if (!field) {
            return null;
        }

        if (
            !options?.forceRefresh &&
            field.countryCode &&
            (field.regionCode || field.regionId)
        ) {
            return {
                countryCode: field.countryCode,
                regionCode: field.regionCode,
                countryId: field.countryId,
                regionId: field.regionId,
            };
        }

        const centroid = this.extractCentroid(field.areaCoordinates);
        if (!centroid) {
            return {
                countryCode: field.countryCode,
                regionCode: field.regionCode,
                countryId: field.countryId,
                regionId: field.regionId,
            };
        }

        const geocode = await this.reverseGeocodeLocation(centroid.lat, centroid.lng);
        const countryCode = geocode.countryCode ?? field.countryCode ?? null;

        if (!countryCode) {
            return {
                countryCode: field.countryCode,
                regionCode: field.regionCode,
                countryId: field.countryId,
                regionId: field.regionId,
            };
        }

        const country = await this.prisma.country.findUnique({
            where: { code: countryCode },
            select: {
                id: true,
                fmdZoneStatus: true,
            },
        });

        let regionId: string | null = null;
        let regionCode: string | null = null;

        if (country?.id && geocode.regionName) {
            const matchedRegion = await this.findMatchingFieldRegion(country.id, geocode.regionName);
            if (matchedRegion) {
                regionId = matchedRegion.id;
                regionCode = matchedRegion.code;
            } else {
                regionCode = geocode.regionName;
            }
        } else {
            regionCode = geocode.regionName ?? null;
        }

        await this.prisma.field.update({
            where: { id: fieldId },
            data: {
                countryCode,
                countryId: country?.id ?? null,
                regionCode,
                regionId,
                fmdFreeZone:
                    country != null ? country.fmdZoneStatus === 'FREE_WITHOUT_VAX' : false,
            },
        });

        return {
            countryCode,
            regionCode,
            countryId: country?.id ?? null,
            regionId,
        };
    }

    /**
     * Résolution complète : coordonnées → countryCode → Country en base
     * Met à jour Field.countryCode + Field.countryId si non défini
     */
    async resolveAndCacheFieldCountry(fieldId: string): Promise<string | null> {
        const location = await this.resolveAndCacheFieldLocation(fieldId);
        return location?.countryCode ?? null;
    }
}
