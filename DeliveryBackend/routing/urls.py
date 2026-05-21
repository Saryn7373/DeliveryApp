from django.urls import path
from routing.views import ResolveAddressView
from routing.views import ShortestPathView

urlpatterns = [
    path('shortest-path/', ShortestPathView.as_view(), name='shortest-path'),
    path('resolve-address/', ResolveAddressView.as_view()),
]
