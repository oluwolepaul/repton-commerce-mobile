import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

const slides = [
  {
    title: 'Everything You Need.\nAll in One Place.',
    body: 'Discover quality products\nand trusted solutions from\nthe Repton Group.',
  },
  {
    title: 'Quality You\nCan Build On.',
    body: 'Shop trusted building materials,\nsteel products and essentials\nwith confidence.',
  },
  {
    title: 'Convenience at\nYour Fingertips.',
    body: 'Browse products, place your\norder and enjoy reliable delivery\nwherever you are.',
  },
] as const;

const background = require('@/assets/onboarding/animated-background.png');

type OnboardingExperienceProps = { onFinish: () => void };
type EntranceImageProps = {
  source: ImageSourcePropType;
  style: object;
  active: boolean;
  delay: number;
  duration?: number;
  from?: 'bottom' | 'right';
  resizeMode?: 'contain' | 'cover';
  label: string;
};

export function OnboardingExperience({ onFinish }: OnboardingExperienceProps) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const updateActiveSlide = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveSlide(Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
  };

  const goNext = () => {
    if (activeSlide === slides.length - 1) {
      onFinish();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (activeSlide + 1), animated: true });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={updateActiveSlide}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}>
        {slides.map((slide, index) => (
          <View key={slide.title} style={{ width, height }}>
            <ImageBackground source={background} resizeMode="stretch" style={styles.screen}>
              <Image source={require('@/assets/onboarding/repton-logo-white.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Repton Group" />
              <Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" onPress={onFinish} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
                <View style={styles.skipUnderline} />
              </Pressable>

              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>

              {index === 0 ? <FirstSlideArtwork active={activeSlide === index} /> : null}
              {index === 1 ? <SecondSlideArtwork active={activeSlide === index} /> : null}
              {index === 2 ? <ThirdSlideArtwork active={activeSlide === index} /> : null}

              <View style={styles.footer}>
                <View style={styles.dots} accessibilityLabel={`Screen ${index + 1} of ${slides.length}`}>
                  {slides.map((item, dotIndex) => (
                    <View key={item.title} style={[styles.dot, index === dotIndex && styles.dotActive]} />
                  ))}
                </View>
                <Pressable accessibilityRole="button" onPress={goNext} style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}>
                  <Text style={styles.nextText}>Next</Text>
                  <Text style={styles.nextArrow}>›</Text>
                </Pressable>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function EntranceImage({ source, style, active, delay, duration = 680, from = 'bottom', resizeMode = 'contain', label }: EntranceImageProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: active ? duration : 180,
      delay: active ? delay : 0,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, delay, duration, progress]);

  const translate = progress.interpolate({ inputRange: [0, 1], outputRange: [from === 'right' ? 52 : 30, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <Animated.Image
      source={source}
      resizeMode={resizeMode}
      accessibilityLabel={label}
      style={[style, { opacity: progress, transform: [{ translateX: from === 'right' ? translate : 0 }, { translateY: from === 'bottom' ? translate : 0 }, { scale }] }]}
    />
  );
}

function FirstSlideArtwork({ active }: { active: boolean }) {
  return (
    <View pointerEvents="none" style={styles.artwork}>
      <EntranceImage source={require('@/assets/onboarding/house-layer.png')} style={styles.house} active={active} delay={0} duration={480} label="Modern home" />
      <EntranceImage source={require('@/assets/onboarding/cement-layer.png')} style={styles.firstCement} active={active} delay={40} duration={480} label="Repton cement sack" />
      <EntranceImage source={require('@/assets/onboarding/steel-layer.png')} style={styles.firstSteel} active={active} delay={80} duration={480} label="Steel reinforcing bars" />
    </View>
  );
}

function SecondSlideArtwork({ active }: { active: boolean }) {
  return (
    <View pointerEvents="none" style={styles.artwork}>
      <EntranceImage source={require('@/assets/onboarding/cement-layer.png')} style={styles.secondCement} active={active} delay={80} label="Repton cement sack" />
      <EntranceImage source={require('@/assets/onboarding/steel-layer.png')} style={styles.secondSteel} active={active} delay={230} label="Steel reinforcing bars" />
      <EntranceImage source={require('@/assets/onboarding/hardhat-layer.png')} style={styles.hardhat} active={active} delay={390} label="Red Repton hard hat" />
    </View>
  );
}

function ThirdSlideArtwork({ active }: { active: boolean }) {
  return (
    <View pointerEvents="none" style={styles.artwork}>
      <EntranceImage source={require('@/assets/onboarding/delivery-layer.png')} style={styles.deliveryTruck} active={active} delay={80} from="right" label="Repton delivery truck" />
      <EntranceImage source={require('@/assets/onboarding/box-layer.png')} style={styles.boxes} active={active} delay={280} label="Repton delivery packages" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B80910' },
  pager: { flex: 1 },
  pagerContent: { flexGrow: 1 },
  screen: { flex: 1, overflow: 'hidden' },
  logo: { position: 'absolute', left: '8%', top: '9%', width: 220, height: 74 },
  skipButton: { position: 'absolute', right: '7.5%', top: '5.3%', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  skipText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  skipUnderline: { height: 1.5, width: 37, marginTop: 4, backgroundColor: '#FFFFFF' },
  title: { position: 'absolute', left: '8%', top: '21%', width: '92%', color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  body: { position: 'absolute', left: '8%', top: '33%', width: '88%', color: 'rgba(255,255,255,0.96)', fontSize: 18, lineHeight: 23, fontWeight: '500' },
  artwork: { position: 'absolute', left: 0, right: 0, top: '44%', height: '41%' },
  house: { position: 'absolute', left: '-15%', bottom: '0%', width: '120%', height: '94%' },
  firstCement: { position: 'absolute', left: '-2%', bottom: '7%', width: '40%', height: '65%', zIndex: 2 },
  firstSteel: { position: 'absolute', right: '-8%', bottom: '1%', width: '72%', height: '44%' },
  secondCement: { position: 'absolute', left: '0%', bottom: '3%', width: '52%', height: '83%' },
  secondSteel: { position: 'absolute', right: '-8%', bottom: '2%', width: '78%', height: '75%' },
  hardhat: { position: 'absolute', right: '2%', bottom: '-1%', width: '48%', height: '46%', zIndex: 2 },
  deliveryTruck: { position: 'absolute', left: '-4%', bottom: '13%', width: '108%', height: '73%' },
  boxes: { position: 'absolute', left: '13%', bottom: '0%', width: '72%', height: '45%' },
  footer: { position: 'absolute', left: '8%', right: '8%', bottom: '3.8%' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.38)' },
  dotActive: { width: 11, height: 11, backgroundColor: '#FFFFFF' },
  nextButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 32, backgroundColor: '#FFFFFF' },
  nextText: { color: '#C50D14', fontSize: 16, fontWeight: '800' },
  nextArrow: { color: '#C50D14', fontSize: 31, lineHeight: 34, marginTop: -3 },
  pressed: { opacity: 0.83 },
});
