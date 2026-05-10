/**
 * ============================================================
 * REVENUES SERVICE — Gestion des revenus manuels
 * ============================================================
 *
 * Ce service gère les revenus que l'agriculteur saisit manuellement,
 * en dehors des ventes d'animaux (qui sont automatiquement calculées
 * depuis le modèle Animal).
 *
 * Catégories de revenus supportées :
 *   • milk       → Vente de lait (coopérative, particuliers)
 *   • crops      → Vente de cultures (blé, orge, tomates…)
 *   • services   → Prestations de service (labour, transport…)
 *   • subsidies  → Subventions agricoles (APIA, CRDA…)
 *   • other      → Autres revenus non catégorisés
 *
 * Ces revenus sont agrégés dans le tableau de bord financier
 * (FinanceService.getDashboard) avec les ventes d'animaux pour
 * calculer le revenu total et le solde net de la ferme.
 *
 * Endpoints exposés (RevenuesController) :
 *   POST   /revenues          → Créer un revenu
 *   GET    /revenues          → Lister les revenus d'un champ
 *   PATCH  /revenues/:id      → Modifier un revenu
 *   DELETE /revenues/:id      → Supprimer un revenu
 * ============================================================
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto, UpdateRevenueDto } from './revenues.dto';

@Injectable()
export class RevenuesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un nouveau revenu manuel pour un agriculteur.
   * Le revenu est lié à un champ (fieldId) et à l'agriculteur (farmId).
   * La date est convertie en objet Date pour le stockage PostgreSQL.
   */
  async create(userId: string, dto: CreateRevenueDto) {
    const { fieldId, amount, category, date, description } = dto;

    return this.prisma.revenue.create({
      data: {
        amount,
        category,
        date: new Date(date),
        description,
        farmer: { connect: { id: userId } },  // Lien vers l'utilisateur propriétaire
        field:  { connect: { id: fieldId } },  // Lien vers le champ concerné
      },
    });
  }

  /**
   * Récupère la liste des revenus manuels d'un champ.
   * Filtres optionnels : catégorie, plage de dates, pagination.
   * Résultats triés par date décroissante (plus récent en premier).
   */
  async findAll(
    userId: string,
    query: {
      fieldId: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { fieldId, category, startDate, endDate, limit = 50, offset = 0 } = query;

    // Construction dynamique du filtre WHERE
    const where: any = { farmId: userId, fieldId };
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate); // >= date début
      if (endDate)   where.date.lte = new Date(endDate);   // <= date fin
    }

    return this.prisma.revenue.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
  }

  /**
   * Met à jour un revenu existant.
   * Vérifie d'abord que le revenu appartient bien à l'utilisateur (ownership check)
   * pour éviter les modifications non autorisées (IDOR protection).
   */
  async update(id: string, userId: string, dto: UpdateRevenueDto) {
    // Vérification ownership : l'utilisateur doit être le propriétaire du revenu
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, farmId: userId },
    });
    if (!revenue) throw new NotFoundException('Revenue not found');

    const { date, amount, category, description } = dto;
    return this.prisma.revenue.update({
      where: { id },
      data: {
        amount,
        category,
        description,
        date: date ? new Date(date) : undefined, // undefined = pas de changement de date
      },
    });
  }

  /**
   * Supprime un revenu.
   * Même protection ownership que update() — un agriculteur ne peut
   * supprimer que ses propres revenus.
   */
  async delete(id: string, userId: string) {
    const revenue = await this.prisma.revenue.findFirst({
      where: { id, farmId: userId },
    });
    if (!revenue) throw new NotFoundException('Revenue not found');
    return this.prisma.revenue.delete({ where: { id } });
  }
}

