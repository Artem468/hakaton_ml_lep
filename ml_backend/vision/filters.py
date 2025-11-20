import django_filters

from .models import Batch


class BatchFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="uploaded_at", lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name="uploaded_at", lookup_expr='lte')
    name = django_filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Batch
        fields = ['name', 'date_from', 'date_to']