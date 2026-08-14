import 'package:flutter/material.dart';
import '../../domain/entities/property.dart';

class PropertyCard extends StatelessWidget {
  const PropertyCard({super.key, required this.property, this.onTap});

  final Property property;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      property.title,
                      style: theme.textTheme.titleMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _StatusChip(status: property.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${property.city}, ${property.country}',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    property.formattedPrice,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Icon(Icons.bed_outlined, size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text('${property.bedrooms}'),
                  const SizedBox(width: 12),
                  Icon(Icons.bathtub_outlined, size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 4),
                  Text('${property.bathrooms}'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final PropertyStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (label, color) = switch (status) {
      PropertyStatus.draft => ('Draft', theme.colorScheme.outline),
      PropertyStatus.published => ('Published', theme.colorScheme.primary),
      PropertyStatus.underOffer => ('Under offer', Colors.orange),
      PropertyStatus.sold => ('Sold', Colors.red),
      PropertyStatus.archived => ('Archived', theme.colorScheme.outline),
    };

    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      backgroundColor: color.withValues(alpha: 0.12),
      labelStyle: TextStyle(color: color),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
