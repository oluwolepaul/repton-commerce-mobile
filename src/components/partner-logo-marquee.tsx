import { useCallback, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

const PARTNERS = [
  { name: 'Dangote', image: require('@/assets/partner-logos/dangote.jpg') },
  { name: 'Lafarge', image: require('@/assets/partner-logos/lafarge.jpg') },
  { name: 'BUA Cement', image: require('@/assets/partner-logos/bua-cement.png') },
  { name: 'Mangal', image: require('@/assets/partner-logos/mangal.png') },
];

const CARD_WIDTH = 104;
const CARD_GAP = 18;
const SET_WIDTH = PARTNERS.length * (CARD_WIDTH + CARD_GAP);

export function PartnerLogoMarquee() {
  const [progress] = useState(() => new Animated.Value(0));

  useFocusEffect(useCallback(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [progress]));

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SET_WIDTH],
  });

  const logoSet = (copy = false) => (
    <View
      key={copy ? 'partner-copy' : 'partner-original'}
      style={styles.logoSet}
      accessibilityElementsHidden={copy}
      importantForAccessibility={copy ? 'no-hide-descendants' : 'auto'}>
      {PARTNERS.map((partner) => (
        <View
          key={partner.name}
          accessible
          accessibilityLabel={`${partner.name} supply partner`}
          style={styles.logoCard}>
          <Image source={partner.image} resizeMode="contain" style={styles.logoImage} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>OUR SUPPLY PARTNERS</Text>
        <Text style={styles.title}>Trusted brands</Text>
      </View>
      <View style={styles.viewport}>
        <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
          {logoSet()}
          {logoSet(true)}
        </Animated.View>
      </View>
    </View>
  );
}

const COLORS = { red: '#D71920', black: '#171717', gray: '#74716F', paper: '#FFFFFF', line: '#EAE7E4' };

const styles = StyleSheet.create({
  section: { marginTop: 25 },
  heading: { marginBottom: 12 },
  eyebrow: { color: COLORS.red, fontSize: 10, fontWeight: '700', letterSpacing: 0.55, marginBottom: 5 },
  title: { color: COLORS.black, fontSize: 20, fontWeight: '700', letterSpacing: -0.35 },
  viewport: { overflow: 'hidden', marginHorizontal: -20, paddingLeft: 20 },
  track: { flexDirection: 'row', alignItems: 'center' },
  logoSet: { width: SET_WIDTH, flexDirection: 'row', alignItems: 'center', gap: CARD_GAP },
  logoCard: {
    width: CARD_WIDTH,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  logoImage: { width: '100%', height: '100%' },
});
