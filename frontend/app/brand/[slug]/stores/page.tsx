"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaLongArrowAltRight, FaLongArrowAltLeft } from "react-icons/fa";
import { IoLocationOutline } from "react-icons/io5";
import { Store } from "../../../../lib/api";
import { useBrand } from "../../../../hooks/queries/useBrands";
import { useStoreSearch } from "../../../../hooks/queries/useStores";
import { StoreCardSkeleton } from "../../../../components/ui/Skeleton";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function StoresPage() {
  const params = useParams();
  const slug = params.slug as string;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const currentLocationMarkerRef = useRef<any>(null);
  const currentLocationOverlayRef = useRef<any>(null); // 현재 위치 CustomOverlay // 현재 위치 마커

  const [stores, setStores] = useState<Store[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchCoords, setSearchCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const { data: brandData } = useBrand(slug);
  const brand = brandData ?? null;

  const {
    data: storeSearchResult,
    isLoading: storeSearchLoading,
    isFetching: storeSearchFetching,
    error: storeSearchError,
  } = useStoreSearch(
    slug,
    searchCoords?.lat ?? null,
    searchCoords?.lng ?? null,
  );

  const queryLoading = storeSearchLoading || storeSearchFetching;
  const loading = geoLoading || queryLoading;

  // 카카오맵 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    const kakaoMapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!kakaoMapKey) {
      console.warn("카카오맵 API 키가 설정되지 않았습니다. NEXT_PUBLIC_KAKAO_MAP_KEY 환경 변수를 확인하세요.");
      // API 키가 없어도 기본 지도는 표시 (제한적 기능)
    }

    // 지도 초기화 함수 (재사용 가능)
    const initMap = () => {
      if (!mapRef.current || !window.kakao || !window.kakao.maps) {
        return false;
      }
      
      if (!mapInstanceRef.current) {
        try {
          const defaultPosition = new window.kakao.maps.LatLng(37.5665, 126.978);
          const options = {
            center: defaultPosition,
            level: 5,
          };
          mapInstanceRef.current = new window.kakao.maps.Map(
            mapRef.current,
            options
          );
          console.log("카카오맵 초기화 성공");
          return true;
        } catch (error) {
          console.error("카카오맵 초기화 실패:", error);
          return false;
        }
      }
      return true;
    };

    // 이미 스크립트가 로드되어 있는지 확인
    if (window.kakao && window.kakao.maps) {
      initMap();
      return;
    }

    // 스크립트가 없으면 로드
    const existingScript = document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
    if (existingScript) {
      // 스크립트가 이미 있으면 로드 완료를 기다림
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao);
          window.kakao.maps.load(() => {
            initMap();
          });
        }
      }, 100);
      
      // 타임아웃 설정 (10초 후 포기)
      setTimeout(() => {
        clearInterval(checkKakao);
        if (!window.kakao || !window.kakao.maps) {
          console.error("카카오맵 스크립트 로드 타임아웃");
        }
      }, 10000);
      
      return () => clearInterval(checkKakao);
    }

    // 새 스크립트 로드
    if (!kakaoMapKey) {
      console.error("❌ 카카오맵 API 키가 설정되지 않았습니다.");
      console.error("📝 설정 방법:");
      console.error("1. 카카오 개발자 콘솔(https://developers.kakao.com/) 접속");
      console.error("2. 내 애플리케이션 → 앱 설정 → 플랫폼");
      console.error("3. 'JavaScript SDK 도메인'에 http://localhost:3000 추가");
      console.error("4. 앱 키에서 'JavaScript 키' 복사");
      console.error("5. 프론트엔드 루트에 .env.local 파일 생성:");
      console.error("   NEXT_PUBLIC_KAKAO_MAP_KEY=복사한_JavaScript_키");
      console.error("6. 개발 서버 재시작 (npm run dev)");
      return;
    }

    const script = document.createElement("script");
    // HTTPS 프로토콜 명시
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false`;
    script.async = true;
    
    script.onload = () => {
      console.log("✅ 카카오맵 스크립트 로드 완료");
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log("✅ 카카오맵 SDK 로드 완료");
          initMap();
        });
      } else {
        console.error("❌ 카카오맵 객체를 찾을 수 없습니다.");
      }
    };
    
    script.onerror = (error) => {
      console.error("❌ 카카오맵 스크립트 로드 실패:", error);
      console.error("📝 확인 사항:");
      console.error("1. NEXT_PUBLIC_KAKAO_MAP_KEY가 올바르게 설정되었는지 확인");
      console.error("2. 카카오 개발자 콘솔에서 'JavaScript SDK 도메인'에 http://localhost:3000이 등록되었는지 확인");
      console.error("3. JavaScript 키가 활성화되어 있는지 확인");
      console.error("4. 브라우저 콘솔에서 네트워크 탭을 확인하여 스크립트 로드 에러 확인");
    };
    
    document.head.appendChild(script);
    
    return () => {
      // 컴포넌트 언마운트 시 정리 (필요한 경우)
    };
  }, []);

  // 지도 초기화 함수 (재사용 가능)
  const initializeMap = (centerLat?: number, centerLng?: number) => {
    if (!mapRef.current || !window.kakao || !window.kakao.maps) {
      console.log("지도 초기화 조건 불만족:", {
        hasMapRef: !!mapRef.current,
        hasKakao: !!window.kakao,
        hasMaps: !!(window.kakao && window.kakao.maps),
      });
      return false;
    }
    
    if (!mapInstanceRef.current) {
      try {
        const lat = centerLat || 37.5665;
        const lng = centerLng || 126.978;
        const defaultPosition = new window.kakao.maps.LatLng(lat, lng);
        const options = {
          center: defaultPosition,
          level: 5,
        };
        mapInstanceRef.current = new window.kakao.maps.Map(
          mapRef.current,
          options
        );
        console.log("카카오맵 초기화 성공");
        return true;
      } catch (error) {
        console.error("카카오맵 초기화 실패:", error);
        return false;
      }
    }
    return true;
  };

  // 현재 위치 마커 표시 (빨간색)
  const showCurrentLocationMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.kakao || !window.kakao.maps) {
      return;
    }

    // 기존 현재 위치 마커 및 오버레이 제거
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setMap(null);
    }
    if (currentLocationOverlayRef.current) {
      currentLocationOverlayRef.current.setMap(null);
    }

    // 빨간색 마커 이미지 생성
    const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
    const imageSize = new window.kakao.maps.Size(24, 35);
    const imageOption = { offset: new window.kakao.maps.Point(12, 35) };
    const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    // 현재 위치 마커 생성
    const currentPosition = new window.kakao.maps.LatLng(lat, lng);
    const marker = new window.kakao.maps.Marker({
      position: currentPosition,
      image: markerImage,
    });
    marker.setMap(mapInstanceRef.current);
    currentLocationMarkerRef.current = marker;

    // CustomOverlay로 "현재 위치" 라벨 표시 (width: fit-content)
    const customOverlay = new window.kakao.maps.CustomOverlay({
      position: currentPosition,
      content: '<div style="padding: 4px 8px; background: white; border: 1px solid #e5e7eb; border-radius: 12px; font-weight: 600; color: #374151; font-size: 11px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">현재 위치</div>',
      yAnchor: 2.2, // 마커 위에 표시
    });
    customOverlay.setMap(mapInstanceRef.current);
    currentLocationOverlayRef.current = customOverlay;
  };

  // 지도에 마커 표시
  const updateMapMarkers = (stores: Store[], currentLat?: number, currentLng?: number) => {
    // 지도가 없으면 초기화 시도
    if (!mapInstanceRef.current) {
      if (!initializeMap(currentLat, currentLng)) {
        console.warn("지도를 초기화할 수 없습니다.");
        return;
      }
    }

    if (!mapInstanceRef.current || !window.kakao || !window.kakao.maps) {
      console.warn("카카오맵이 준비되지 않았습니다.");
      return;
    }

    // 기존 매장 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // 현재 위치 마커 표시
    if (currentLat && currentLng) {
      showCurrentLocationMarker(currentLat, currentLng);
    }

    if (stores.length === 0) {
      // 매장이 없어도 현재 위치는 중심으로 이동
      if (currentLat && currentLng && mapInstanceRef.current) {
        const currentPosition = new window.kakao.maps.LatLng(currentLat, currentLng);
        mapInstanceRef.current.setCenter(currentPosition);
        mapInstanceRef.current.setLevel(5);
      }
      return;
    }

    // 매장 마커 생성
    const bounds = new window.kakao.maps.LatLngBounds();
    
    // 현재 위치도 bounds에 포함
    if (currentLat && currentLng) {
      bounds.extend(new window.kakao.maps.LatLng(currentLat, currentLng));
    }

    stores.forEach((store) => {
      const position = new window.kakao.maps.LatLng(
        parseFloat(store.y),
        parseFloat(store.x)
      );
      const marker = new window.kakao.maps.Marker({ position });
      marker.setMap(mapInstanceRef.current);
      markersRef.current.push(marker);
      bounds.extend(position);

      // 매장 마커 클릭 시 리스트에서 선택 상태로 변경 (인포윈도우 표시 안 함)
      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelectedStoreId(store.id);
        // 지도 중심을 클릭한 매장으로 이동
        const clickedPosition = new window.kakao.maps.LatLng(
          parseFloat(store.y),
          parseFloat(store.x)
        );
        mapInstanceRef.current.setCenter(clickedPosition);
        mapInstanceRef.current.setLevel(3);
      });
    });

    // 지도 범위 조정 (현재 위치와 모든 매장 포함)
    mapInstanceRef.current.setBounds(bounds);
  };

  useEffect(() => {
    if (!storeSearchResult || !location) return;

    const sortedStores = [...(storeSearchResult.stores || [])].sort((a, b) => {
      const distanceA = parseFloat(a.distance || "0");
      const distanceB = parseFloat(b.distance || "0");
      return distanceA - distanceB;
    });
    setStores(sortedStores);

    const { lat, lng } = location;
    const initMapIfNeeded = () => {
      if (!mapInstanceRef.current) {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            initializeMap(lat, lng);
            updateMapMarkers(sortedStores, lat, lng);
          });
        } else {
          setTimeout(() => {
            if (window.kakao && window.kakao.maps) {
              window.kakao.maps.load(() => {
                initializeMap(lat, lng);
                updateMapMarkers(sortedStores, lat, lng);
              });
            }
          }, 1000);
        }
      } else {
        updateMapMarkers(sortedStores, lat, lng);
      }
    };

    initMapIfNeeded();
  }, [storeSearchResult, location]);

  useEffect(() => {
    if (!storeSearchError) return;
    const message =
      storeSearchError instanceof Error
        ? storeSearchError.message
        : "매장 검색에 실패했습니다.";
    alert(message);
    setStores([]);
  }, [storeSearchError]);

  const handleSearch = () => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      return;
    }

    setGeoLoading(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setSearchCoords({ lat, lng });
        setGeoLoading(false);
      },
      (error) => {
        let errorMessage = "위치 정보를 가져올 수 없습니다.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
            break;
        }

        alert(errorMessage);
        setGeoLoading(false);
      },
      options
    );
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
      <div className="mb-4 sm:mb-6">
        <Link
          href={`/brand/${slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
        >
          <FaLongArrowAltLeft /> {brand?.name || "브랜드"} 메뉴로 돌아가기
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
          {brand?.name || "브랜드"} 매장 찾기
        </h1>
      </div>

      <div className="mb-3 sm:mb-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("버튼 클릭 이벤트 발생");
            handleSearch();
          }}
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              검색 중...
            </span>
          ) : (
            <span className="flex justify-center items-center gap-2 cursor-pointer">
              <IoLocationOutline className="text-base sm:text-lg" />
              내 주변 매장 검색
            </span>
          )}
        </button>
        <p className="mt-2 text-xs text-gray-500">
          위치 권한을 허용해주시면 주변 매장을 찾아드립니다
        </p>
        {loading && (
          <p className="mt-2 text-xs text-blue-600">
            위치 정보를 가져오는 중입니다...
          </p>
        )}
      </div>

      {/* 모바일: flex column (지도 먼저, 리스트 아래) / 태블릿/PC: grid 2열 */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-3 sm:gap-4">
        {/* 지도 영역 */}
        <div className="rounded-lg border border-gray-200 bg-gray-100 order-1">
          <div
            ref={mapRef}
            className="h-[400px] sm:h-[500px] md:h-[600px] w-full rounded-lg"
            style={{ minHeight: "400px" }}
          />
        </div>

        {/* 매장 리스트 */}
        <div className="space-y-3 sm:space-y-4 overflow-y-auto order-2 md:order-2 md:max-h-[600px]">
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <StoreCardSkeleton key={i} />
              ))}
            </div>
          ) : stores && stores.length > 0 ? (
            stores.map((store) => (
              <div
                key={store.id}
                onClick={() => {
                  setSelectedStoreId(store.id);
                  // 지도 중심을 클릭한 매장으로 이동
                  if (mapInstanceRef.current && window.kakao && window.kakao.maps) {
                    const clickedPosition = new window.kakao.maps.LatLng(
                      parseFloat(store.y),
                      parseFloat(store.x)
                    );
                    mapInstanceRef.current.setCenter(clickedPosition);
                    mapInstanceRef.current.setLevel(3);
                  }
                }}
                className={`rounded-lg border-2 p-3 sm:p-4 transition-all cursor-pointer ${
                  selectedStoreId === store.id
                    ? "border-orange-500 bg-orange-50 shadow-lg"
                    : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-lg"
                }`}
              >
                <h3 className={`mb-2 text-sm sm:text-base font-semibold ${
                  selectedStoreId === store.id ? "text-orange-700" : "text-gray-800"
                }`}>
                  {store.place_name}
                </h3>
                <p className="mb-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                  {store.road_address_name || store.address_name}
                </p>
                {store.phone && (
                  <p className="mb-2 text-xs sm:text-sm text-gray-500">전화: {store.phone}</p>
                )}
                <div className="mb-2 flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                  <span>거리: 약 {(parseFloat(store.distance) / 1000).toFixed(1)}km</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={store.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:underline"
                  >
                    카카오맵에서 보기 <FaLongArrowAltRight className="text-xs sm:text-sm" />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-xs sm:text-sm text-gray-500 py-6 sm:py-8">
              {location
                ? "주변에 매장이 없습니다."
                : "위치 검색 버튼을 눌러주세요."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
