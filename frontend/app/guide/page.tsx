import Image from "next/image";
import Link from "next/link";
import { LuClipboardList } from "react-icons/lu";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { IoLocationOutline } from "react-icons/io5";
import { FaStar } from "react-icons/fa";
import { FaUserCircle } from "react-icons/fa";
import { BsFillMenuButtonWideFill } from "react-icons/bs";

export default function GuidePage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <Image
              src="/logo.png"
              alt="Hamburger-Collection Logo"
              width={48}
              height={48}
              className="object-contain sm:w-16 sm:h-16"
              priority
            />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Hamburger-Collection 가이드
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 px-4">
            다양한 햄버거 브랜드의 메뉴와 정보를 한 곳에서 탐색하세요
          </p>
        </div>

        {/* 프로젝트 소개 */}
        <section className="mb-8 sm:mb-12 rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold text-gray-900">
            프로젝트 소개
          </h2>
          <p className="mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base text-gray-700">
            <strong>Hamburger-Collection</strong>은 국내 주요 햄버거 프랜차이즈 브랜드의
            버거 단품 메뉴 정보와 영양 성분을 한눈에 비교하고 탐색할 수 있는 웹 애플리케이션입니다.
            사용자들은 각 브랜드별 메뉴를 쉽게 검색하고, 영양 정보를 확인하며,
            주변 매장을 찾아볼 수 있습니다.
          </p>
          <p className="leading-relaxed text-sm sm:text-base text-gray-700">
            본 프로젝트는 오픈서베이에서 조사·발표한{' '}
            <strong>&apos;버거 프랜차이즈 트렌드 리포트 2023&apos;</strong> 자료를
            바탕으로, 사람들이 가장 많이 이용하는 햄버거 브랜드 상위 7개를 선정하여
            구현되었습니다.
          </p>
        </section>

        {/* 브랜드 조사 자료 */}
        <section className="mb-8 sm:mb-12 rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold text-gray-900">
            브랜드 선정 기준
          </h2>
          <div className="mb-4">
            <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
              출처: 오픈서베이 &apos;버거 프랜차이즈 트렌드 리포트 2023&apos;
            </p>
            <div className="relative mb-3 sm:mb-4 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
              <Image
                src="/guide.PNG"
                alt="버거 프랜차이즈 브랜드 이용 순위"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
            <p className="leading-relaxed text-sm sm:text-base text-gray-700">
              본 프로젝트에서는 위 조사 자료를 바탕으로 이용률 상위 7개 브랜드를
              선정하여 서비스를 제공합니다:
            </p>
            <ol className="mt-3 sm:mt-4 list-decimal space-y-1.5 sm:space-y-2 pl-5 sm:pl-6 text-sm sm:text-base text-gray-700">
              <li>
                <strong>버거킹</strong> (이용률 30.7%)
              </li>
              <li>
                <strong>맥도날드</strong> (이용률 22.4%)
              </li>
              <li>
                <strong>맘스터치</strong> (이용률 15.1%)
              </li>
              <li>
                <strong>롯데리아</strong> (이용률 13.8%)
              </li>
              <li>
                <strong>노브랜드버거</strong> (이용률 4.5%)
              </li>
              <li>
                <strong>KFC</strong> (이용률 3.4%)
              </li>
              <li>
                <strong>프랭크버거</strong> (이용률 3.4%)
              </li>
            </ol>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="mb-8 sm:mb-12 rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-semibold text-gray-900">
            주요 기능
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
            {/* 브랜드별 메뉴 탐색 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-gray-900">
                <BsFillMenuButtonWideFill className="mr-2 inline text-orange-500 text-sm sm:text-base" />
                브랜드별 메뉴 탐색
              </h3>
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-700">
                각 브랜드별로 제공되는 다양한 메뉴를 확인하고, 상세한 영양 정보를
                조회할 수 있습니다.
              </p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
                <li>• 메뉴 이미지 및 설명 확인</li>
                <li>• 칼로리, 나트륨 등 영양 정보 제공</li>
                <li>• 칼로리 기준 정렬 기능</li>
                <li>• 실시간 메뉴 검색 (디바운스 적용)</li>
              </ul>
            </div>

            {/* 매장 찾기 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-gray-900">
                <IoLocationOutline className="mr-2 inline text-orange-500 text-sm sm:text-base" />
                매장 찾기
              </h3>
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-700">
                현재 위치를 기반으로 주변 매장을 검색하고 카카오맵을 통해 위치를
                확인할 수 있습니다.
              </p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
                <li>• 현재 위치 기반 매장 검색</li>
                <li>• 거리순 정렬</li>
                <li>• 카카오맵 연동</li>
                <li>• 매장 상세 정보 확인</li>
              </ul>
            </div>

            {/* 게시판 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-gray-900">
                <LuClipboardList className="mr-2 inline text-orange-500 text-sm sm:text-base" />
                게시판
              </h3>
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-700">
                사용자들이 메뉴에 대한 의견을 공유하고 소통할 수 있는 게시판
                기능을 제공합니다.
              </p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
                <li>• 게시글 작성, 수정, 삭제</li>
                <li>• 댓글 기능</li>
                <li>• 작성자 본인만 수정/삭제 가능</li>
                <li>• 게시글 검색 기능</li>
              </ul>
            </div>

            {/* 즐겨찾기 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-gray-900">
                <FaStar className="mr-2 inline text-orange-500 text-sm sm:text-base" />
                즐겨찾기
              </h3>
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-700">
                로그인한 사용자는 관심 있는 메뉴를 즐겨찾기로 저장하여 나중에
                쉽게 찾아볼 수 있습니다.
              </p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
                <li>• 메뉴 카드에서 별표 클릭</li>
                <li>• 메뉴 상세 페이지에서 즐겨찾기 추가</li>
                <li>• 즐겨찾기 목록에서 한눈에 확인</li>
                <li>• 로그인 사용자 전용 기능</li>
              </ul>
            </div>

            {/* 사용자 인증 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-gray-900">
                <FaUserCircle className="mr-2 inline text-orange-500 text-sm sm:text-base" />
                사용자 인증
              </h3>
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-700">
                카카오 OAuth를 통한 간편 로그인을 지원하며, 로그인한 사용자는
                추가 기능을 이용할 수 있습니다.
              </p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
                <li>• 카카오 소셜 로그인</li>
                <li>• 내 정보 페이지</li>
                <li>• 내가 작성한 게시글 관리</li>
                <li>• 즐겨찾기 기능 이용</li>
              </ul>
            </div>

            {/* 메뉴 검색 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <h3 className="mb-2 text-base sm:text-lg font-semibold text-gray-900">
                <FaMagnifyingGlass className="mr-2 inline text-orange-500 text-sm sm:text-base" />
                메뉴 검색
              </h3>
              <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-700">
                각 브랜드 페이지에서 메뉴 이름이나 설명으로 실시간 검색이
                가능합니다.
              </p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-600">
                <li>• 실시간 검색 (디바운스 300ms)</li>
                <li>• 메뉴 이름 및 설명 검색</li>
                <li>• 검색 결과 즉시 표시</li>
                <li>• 검색 결과 페이지네이션</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 시작하기 */}
        <section className="rounded-lg border border-gray-200 bg-orange-50 p-4 sm:p-6 shadow-sm">
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold text-gray-900">
            시작하기
          </h2>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-700">
            Hamburger-Collection을 시작하려면 아래 링크를 클릭하세요.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Link
              href="/"
              className="rounded-lg bg-orange-500 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium text-white transition-colors hover:bg-orange-600 text-center"
            >
              메인 페이지로 이동
            </Link>
            <Link
              href="/board"
              className="rounded-lg border border-orange-500 bg-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium text-orange-500 transition-colors hover:bg-orange-50 text-center"
            >
              게시판 보기
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
